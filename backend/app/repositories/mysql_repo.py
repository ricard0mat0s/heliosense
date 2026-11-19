import json
from contextlib import contextmanager
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Iterator

import pymysql
from pymysql.cursors import DictCursor

from app.config import Settings
from app.repositories.base import (
    ConflictError,
    HelioSenseRepository,
    NotFoundError,
    ValidationDomainError,
)


def _float(val: Any) -> float:
    if val is None:
        return 0.0
    return float(val)


def _translate_mysql_error(exc: pymysql.MySQLError, context: str) -> None:
    errno = exc.args[0] if exc.args else None
    msg = str(exc.args[1]) if len(exc.args) > 1 else str(exc)
    lower = msg.lower()

    if errno == 1062:
        if "email" in lower:
            raise ConflictError("Este e-mail já está cadastrado.") from exc
        if "cpf" in lower or "primary" in lower and context == "usuario":
            raise ConflictError("Este CPF já está cadastrado.") from exc
        if "numero_serie" in lower:
            raise ConflictError("Já existe um painel cadastrado com este número de série.") from exc
        if "registrado_em" in lower or "leitura" in lower or context == "leitura":
            raise ConflictError(
                "Já existe uma leitura registrada para este painel neste mesmo horário."
            ) from exc
        if "marca" in lower or "nome_modelo" in lower or context == "modelo":
            raise ConflictError("Este modelo de painel (marca + nome) já está cadastrado.") from exc
        raise ConflictError("Registro duplicado: já existe um item com estes dados únicos.") from exc

    if errno == 1451:
        if context == "casa":
            raise ConflictError(
                "Não é possível excluir esta casa porque existem painéis vinculados a ela (ON DELETE RESTRICT)."
            ) from exc
        if context == "painel":
            raise ConflictError(
                "Não é possível excluir este painel porque existem leituras ou alertas vinculados a ele. "
                "Altere o status do painel para 'inativo'."
            ) from exc
        raise ConflictError(
            "Operação bloqueada por integridade referencial (ON DELETE RESTRICT): existem registros dependentes."
        ) from exc

    if errno == 1452:
        raise ValidationDomainError(
            "Referência inválida (chave estrangeira não encontrada)."
        ) from exc

    raise exc


class MySQLRepository(HelioSenseRepository):
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    @contextmanager
    def _connection(self) -> Iterator[pymysql.connections.Connection]:
        conn = pymysql.connect(
            host=self._settings.mysql_host,
            port=self._settings.mysql_port,
            user=self._settings.mysql_user,
            password=self._settings.mysql_password,
            database=self._settings.mysql_database,
            charset="utf8mb4",
            cursorclass=DictCursor,
            autocommit=False,
        )
        try:
            yield conn
        finally:
            conn.close()

    def check_connection(self) -> bool:
        try:
            with self._connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
            return True
        except pymysql.MySQLError:
            return False

    # --- Usuários ---

    def get_user_by_cpf(self, cpf: str) -> dict[str, Any] | None:
        sql = """
            SELECT cpf, nome, data_nascimento, email, senha_hash, telefone,
                   logradouro, numero, complemento, bairro, cidade, uf, cep,
                   ativo, criado_em
            FROM usuarios
            WHERE cpf = %s
        """
        with self._connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (cpf,))
                row = cur.fetchone()
                if row:
                    row["ativo"] = bool(row["ativo"])
                return row

    def get_user_by_email(self, email: str) -> dict[str, Any] | None:
        sql = """
            SELECT cpf, nome, data_nascimento, email, senha_hash, telefone,
                   logradouro, numero, complemento, bairro, cidade, uf, cep,
                   ativo, criado_em
            FROM usuarios
            WHERE LOWER(email) = LOWER(%s)
        """
        with self._connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (email,))
                row = cur.fetchone()
                if row:
                    row["ativo"] = bool(row["ativo"])
                return row

    def create_user(self, data: dict[str, Any]) -> dict[str, Any]:
        sql = """
            INSERT INTO usuarios (
                cpf, nome, data_nascimento, email, senha_hash, telefone,
                logradouro, numero, complemento, bairro, cidade, uf, cep,
                ativo, criado_em
            ) VALUES (
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s,
                TRUE, NOW()
            )
        """
        try:
            with self._connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        sql,
                        (
                            data["cpf"],
                            data["nome"],
                            data["data_nascimento"],
                            data["email"].lower(),
                            data["senha_hash"],
                            data["telefone"],
                            data["logradouro"],
                            data["numero"],
                            data.get("complemento"),
                            data["bairro"],
                            data["cidade"],
                            data["uf"],
                            data["cep"],
                        ),
                    )
                conn.commit()
        except pymysql.MySQLError as exc:
            _translate_mysql_error(exc, "usuario")

        created = self.get_user_by_cpf(data["cpf"])
        assert created is not None
        return created

    def update_user(self, cpf: str, data: dict[str, Any]) -> dict[str, Any]:
        sql = """
            UPDATE usuarios
            SET nome = %s,
                data_nascimento = %s,
                telefone = %s,
                logradouro = %s,
                numero = %s,
                complemento = %s,
                bairro = %s,
                cidade = %s,
                uf = %s,
                cep = %s
            WHERE cpf = %s
        """
        with self._connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    sql,
                    (
                        data["nome"],
                        data["data_nascimento"],
                        data["telefone"],
                        data["logradouro"],
                        data["numero"],
                        data.get("complemento"),
                        data["bairro"],
                        data["cidade"],
                        data["uf"],
                        data["cep"],
                        cpf,
                    ),
                )
                if cur.rowcount == 0:
                    raise NotFoundError("Usuário não encontrado.")
            conn.commit()

        updated = self.get_user_by_cpf(cpf)
        assert updated is not None
        return updated

    def deactivate_user(self, cpf: str) -> None:
        sql = "UPDATE usuarios SET ativo = FALSE WHERE cpf = %s"
        with self._connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (cpf,))
                if cur.rowcount == 0:
                    raise NotFoundError("Usuário não encontrado.")
            conn.commit()

    # --- Casas ---

    def list_houses(self, cpf: str) -> list[dict[str, Any]]:
        sql = """
            SELECT c.id_casa, c.cpf_proprietario, c.nome, c.logradouro, c.numero,
                   c.complemento, c.bairro, c.cidade, c.uf, c.cep, c.criado_em,
                   COUNT(DISTINCT p.id_painel) AS qtd_paineis,
                   COALESCE(SUM(l.energia_kwh), 0) AS energia_total_kwh
            FROM casas c
            LEFT JOIN paineis p ON p.id_casa = c.id_casa
            LEFT JOIN leituras_energia l ON l.id_painel = p.id_painel
            WHERE c.cpf_proprietario = %s
            GROUP BY c.id_casa, c.cpf_proprietario, c.nome, c.logradouro, c.numero,
                     c.complemento, c.bairro, c.cidade, c.uf, c.cep, c.criado_em
            ORDER BY c.criado_em DESC, c.id_casa DESC
        """
        with self._connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (cpf,))
                rows = cur.fetchall()
                for row in rows:
                    row["qtd_paineis"] = int(row["qtd_paineis"] or 0)
                    row["energia_total_kwh"] = _float(row["energia_total_kwh"])
                return rows

    def get_house(self, id_casa: int, cpf: str) -> dict[str, Any] | None:
        sql = """
            SELECT c.id_casa, c.cpf_proprietario, c.nome, c.logradouro, c.numero,
                   c.complemento, c.bairro, c.cidade, c.uf, c.cep, c.criado_em,
                   COUNT(DISTINCT p.id_painel) AS qtd_paineis,
                   COALESCE(SUM(l.energia_kwh), 0) AS energia_total_kwh
            FROM casas c
            LEFT JOIN paineis p ON p.id_casa = c.id_casa
            LEFT JOIN leituras_energia l ON l.id_painel = p.id_painel
            WHERE c.id_casa = %s AND c.cpf_proprietario = %s
            GROUP BY c.id_casa, c.cpf_proprietario, c.nome, c.logradouro, c.numero,
                     c.complemento, c.bairro, c.cidade, c.uf, c.cep, c.criado_em
        """
        with self._connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (id_casa, cpf))
                row = cur.fetchone()
                if row:
                    row["qtd_paineis"] = int(row["qtd_paineis"] or 0)
                    row["energia_total_kwh"] = _float(row["energia_total_kwh"])
                return row

    def create_house(self, cpf: str, data: dict[str, Any]) -> dict[str, Any]:
        sql = """
            INSERT INTO casas (
                cpf_proprietario, nome, logradouro, numero, complemento,
                bairro, cidade, uf, cep, criado_em
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
        """
        try:
            with self._connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        sql,
                        (
                            cpf,
                            data.get("nome"),
                            data["logradouro"],
                            data["numero"],
                            data.get("complemento"),
                            data["bairro"],
                            data["cidade"],
                            data["uf"],
                            data["cep"],
                        ),
                    )
                    new_id = cur.lastrowid
                conn.commit()
        except pymysql.MySQLError as exc:
            _translate_mysql_error(exc, "casa")

        house = self.get_house(new_id, cpf)
        assert house is not None
        return house

    def update_house(self, id_casa: int, cpf: str, data: dict[str, Any]) -> dict[str, Any]:
        sql = """
            UPDATE casas
            SET nome = %s,
                logradouro = %s,
                numero = %s,
                complemento = %s,
                bairro = %s,
                cidade = %s,
                uf = %s,
                cep = %s
            WHERE id_casa = %s AND cpf_proprietario = %s
        """
        with self._connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    sql,
                    (
                        data.get("nome"),
                        data["logradouro"],
                        data["numero"],
                        data.get("complemento"),
                        data["bairro"],
                        data["cidade"],
                        data["uf"],
                        data["cep"],
                        id_casa,
                        cpf,
                    ),
                )
                if cur.rowcount == 0:
                    raise NotFoundError("Casa não encontrada.")
            conn.commit()

        house = self.get_house(id_casa, cpf)
        assert house is not None
        return house

    def delete_house(self, id_casa: int, cpf: str) -> None:
        sql = "DELETE FROM casas WHERE id_casa = %s AND cpf_proprietario = %s"
        try:
            with self._connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(sql, (id_casa, cpf))
                    if cur.rowcount == 0:
                        raise NotFoundError("Casa não encontrada.")
                conn.commit()
        except pymysql.MySQLError as exc:
            _translate_mysql_error(exc, "casa")

    # --- Modelos de Painéis ---

    def list_panel_models(self) -> list[dict[str, Any]]:
        sql = """
            SELECT id_modelo, marca, nome_modelo, potencia_max_w, eficiencia_pct
            FROM modelos_paineis
            ORDER BY marca ASC, nome_modelo ASC
        """
        with self._connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql)
                rows = cur.fetchall()
                for row in rows:
                    row["eficiencia_pct"] = (
                        float(row["eficiencia_pct"]) if row["eficiencia_pct"] is not None else None
                    )
                return rows

    def create_panel_model(self, data: dict[str, Any]) -> dict[str, Any]:
        sql = """
            INSERT INTO modelos_paineis (marca, nome_modelo, potencia_max_w, eficiencia_pct)
            VALUES (%s, %s, %s, %s)
        """
        try:
            with self._connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        sql,
                        (
                            data["marca"].strip(),
                            data["nome_modelo"].strip(),
                            data["potencia_max_w"],
                            data.get("eficiencia_pct"),
                        ),
                    )
                    new_id = cur.lastrowid
                conn.commit()
        except pymysql.MySQLError as exc:
            _translate_mysql_error(exc, "modelo")

        with self._connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id_modelo, marca, nome_modelo, potencia_max_w, eficiencia_pct
                    FROM modelos_paineis WHERE id_modelo = %s
                    """,
                    (new_id,),
                )
                row = cur.fetchone()
                assert row is not None
                row["eficiencia_pct"] = (
                    float(row["eficiencia_pct"]) if row["eficiencia_pct"] is not None else None
                )
                return row

    # --- Painéis ---

    def list_panels(self, cpf: str, id_casa: int | None = None) -> list[dict[str, Any]]:
        params: list[Any] = [cpf]
        extra_where = ""
        if id_casa is not None:
            extra_where = "AND p.id_casa = %s"
            params.append(id_casa)

        sql = f"""
            SELECT p.id_painel, p.id_casa, c.nome AS nome_casa,
                   p.id_modelo, m.marca, m.nome_modelo, m.potencia_max_w, m.eficiencia_pct,
                   p.numero_serie, p.data_instalacao, p.status,
                   COALESCE((SELECT SUM(l.energia_kwh) FROM leituras_energia l WHERE l.id_painel = p.id_painel), 0) AS energia_total_kwh,
                   (SELECT COUNT(*) FROM alertas a WHERE a.id_painel = p.id_painel AND a.resolvido = FALSE) AS alertas_abertos
            FROM paineis p
            INNER JOIN casas c ON c.id_casa = p.id_casa
            INNER JOIN modelos_paineis m ON m.id_modelo = p.id_modelo
            WHERE c.cpf_proprietario = %s {extra_where}
            ORDER BY p.id_casa ASC, p.id_painel ASC
        """
        with self._connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, tuple(params))
                rows = cur.fetchall()
                for row in rows:
                    row["eficiencia_pct"] = (
                        float(row["eficiencia_pct"]) if row["eficiencia_pct"] is not None else None
                    )
                    row["energia_total_kwh"] = _float(row["energia_total_kwh"])
                    row["alertas_abertos"] = int(row["alertas_abertos"] or 0)
                return rows

    def get_panel(self, id_painel: int, cpf: str) -> dict[str, Any] | None:
        sql = """
            SELECT p.id_painel, p.id_casa, c.nome AS nome_casa,
                   p.id_modelo, m.marca, m.nome_modelo, m.potencia_max_w, m.eficiencia_pct,
                   p.numero_serie, p.data_instalacao, p.status,
                   COALESCE((SELECT SUM(l.energia_kwh) FROM leituras_energia l WHERE l.id_painel = p.id_painel), 0) AS energia_total_kwh,
                   (SELECT COUNT(*) FROM alertas a WHERE a.id_painel = p.id_painel AND a.resolvido = FALSE) AS alertas_abertos
            FROM paineis p
            INNER JOIN casas c ON c.id_casa = p.id_casa
            INNER JOIN modelos_paineis m ON m.id_modelo = p.id_modelo
            WHERE p.id_painel = %s AND c.cpf_proprietario = %s
        """
        with self._connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (id_painel, cpf))
                row = cur.fetchone()
                if row:
                    row["eficiencia_pct"] = (
                        float(row["eficiencia_pct"]) if row["eficiencia_pct"] is not None else None
                    )
                    row["energia_total_kwh"] = _float(row["energia_total_kwh"])
                    row["alertas_abertos"] = int(row["alertas_abertos"] or 0)
                return row

    def create_panel(self, cpf: str, data: dict[str, Any]) -> dict[str, Any]:
        # Verify house ownership before insert
        if not self.get_house(data["id_casa"], cpf):
            raise NotFoundError("Casa informada não foi encontrada ou não pertence a você.")

        sql = """
            INSERT INTO paineis (id_casa, id_modelo, numero_serie, data_instalacao, status)
            VALUES (%s, %s, %s, %s, %s)
        """
        try:
            with self._connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        sql,
                        (
                            data["id_casa"],
                            data["id_modelo"],
                            data["numero_serie"],
                            data["data_instalacao"],
                            data["status"],
                        ),
                    )
                    new_id = cur.lastrowid
                conn.commit()
        except pymysql.MySQLError as exc:
            _translate_mysql_error(exc, "painel")

        panel = self.get_panel(new_id, cpf)
        assert panel is not None
        return panel

    def update_panel(self, id_painel: int, cpf: str, data: dict[str, Any]) -> dict[str, Any]:
        if not self.get_panel(id_painel, cpf):
            raise NotFoundError("Painel não encontrado.")
        if not self.get_house(data["id_casa"], cpf):
            raise NotFoundError("Casa de destino não encontrada ou não pertence a você.")

        sql = """
            UPDATE paineis
            SET id_casa = %s,
                id_modelo = %s,
                numero_serie = %s,
                data_instalacao = %s,
                status = %s
            WHERE id_painel = %s
        """
        try:
            with self._connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        sql,
                        (
                            data["id_casa"],
                            data["id_modelo"],
                            data["numero_serie"],
                            data["data_instalacao"],
                            data["status"],
                            id_painel,
                        ),
                    )
                conn.commit()
        except pymysql.MySQLError as exc:
            _translate_mysql_error(exc, "painel")

        updated = self.get_panel(id_painel, cpf)
        assert updated is not None
        return updated

    def delete_panel(self, id_painel: int, cpf: str) -> None:
        if not self.get_panel(id_painel, cpf):
            raise NotFoundError("Painel não encontrado.")

        sql = "DELETE FROM paineis WHERE id_painel = %s"
        try:
            with self._connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(sql, (id_painel,))
                conn.commit()
        except pymysql.MySQLError as exc:
            _translate_mysql_error(exc, "painel")

    # --- Dashboard (Stored Procedure sp_resumo_energia_casa) ---

    def get_dashboard_summary(self, cpf: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        with self._connection() as conn:
            with conn.cursor() as cur:
                cur.execute("CALL sp_resumo_energia_casa(%s)", (cpf,))
                casas_rows = list(cur.fetchall() or [])
                paineis_rows: list[dict[str, Any]] = []
                if cur.nextset():
                    paineis_rows = list(cur.fetchall() or [])
                # Drain any remaining result sets returned by MySQL CALL protocol
                while cur.nextset():
                    pass

        for row in casas_rows:
            row["qtd_paineis"] = int(row.get("qtd_paineis") or 0)
            row["energia_total_casa"] = _float(row.get("energia_total_casa"))

        for row in paineis_rows:
            row["energia_total_painel"] = _float(row.get("energia_total_painel"))

        return casas_rows, paineis_rows

    # --- Leituras de Energia (Views + Insert) ---

    def get_hourly_readings(
        self,
        id_painel: int,
        cpf: str,
        data_inicio: datetime | None = None,
        data_fim: datetime | None = None,
        limit: int = 168,
    ) -> list[dict[str, Any]]:
        if not self.get_panel(id_painel, cpf):
            raise NotFoundError("Painel não encontrado.")

        clauses = ["id_painel = %s", "cpf_proprietario = %s"]
        params: list[Any] = [id_painel, cpf]
        if data_inicio is not None:
            clauses.append("registrado_em >= %s")
            params.append(data_inicio)
        if data_fim is not None:
            clauses.append("registrado_em <= %s")
            params.append(data_fim)

        where_sql = " AND ".join(clauses)
        # Fetch most recent N rows from the hourly VIEW, then order chronologically for charts
        sql = f"""
            SELECT * FROM (
                SELECT id_leitura, id_painel, numero_serie, id_casa, nome_casa,
                       registrado_em, energia_kwh, potencia_max_w
                FROM vw_energia_painel_horaria
                WHERE {where_sql}
                ORDER BY registrado_em DESC
                LIMIT %s
            ) AS recentes
            ORDER BY registrado_em ASC
        """
        params.append(limit)

        with self._connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, tuple(params))
                rows = cur.fetchall()
                for row in rows:
                    row["energia_kwh"] = _float(row["energia_kwh"])
                return rows

    def get_daily_readings(
        self,
        id_painel: int,
        cpf: str,
        data_inicio: date | None = None,
        data_fim: date | None = None,
        limit: int = 60,
    ) -> list[dict[str, Any]]:
        if not self.get_panel(id_painel, cpf):
            raise NotFoundError("Painel não encontrado.")

        clauses = ["id_painel = %s", "cpf_proprietario = %s"]
        params: list[Any] = [id_painel, cpf]
        if data_inicio is not None:
            clauses.append("data_leitura >= %s")
            params.append(data_inicio)
        if data_fim is not None:
            clauses.append("data_leitura <= %s")
            params.append(data_fim)

        where_sql = " AND ".join(clauses)
        sql = f"""
            SELECT * FROM (
                SELECT id_painel, numero_serie, id_casa, nome_casa,
                       data_leitura, total_leituras, energia_total_kwh
                FROM vw_energia_painel_diaria
                WHERE {where_sql}
                ORDER BY data_leitura DESC
                LIMIT %s
            ) AS recentes
            ORDER BY data_leitura ASC
        """
        params.append(limit)

        with self._connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, tuple(params))
                rows = cur.fetchall()
                for row in rows:
                    row["total_leituras"] = int(row["total_leituras"] or 0)
                    row["energia_total_kwh"] = _float(row["energia_total_kwh"])
                return rows

    def insert_reading(
        self,
        id_painel: int,
        cpf: str,
        registrado_em: datetime,
        energia_kwh: Decimal,
    ) -> dict[str, Any]:
        panel = self.get_panel(id_painel, cpf)
        if not panel:
            raise NotFoundError("Painel não encontrado.")

        # Only INSERT into leituras_energia; MySQL AFTER INSERT trigger creates alertas automatically.
        insert_sql = """
            INSERT INTO leituras_energia (id_painel, registrado_em, energia_kwh)
            VALUES (%s, %s, %s)
        """
        alerts_sql = """
            SELECT a.id_alerta, a.id_painel, p.numero_serie, p.id_casa, c.nome AS nome_casa,
                   a.id_leitura, a.tipo_alerta, a.mensagem, a.resolvido, a.criado_em, a.resolvido_em
            FROM alertas a
            INNER JOIN paineis p ON p.id_painel = a.id_painel
            INNER JOIN casas c ON c.id_casa = p.id_casa
            WHERE a.id_leitura = %s
            ORDER BY a.id_alerta ASC
        """
        try:
            with self._connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(insert_sql, (id_painel, registrado_em, energia_kwh))
                    id_leitura = cur.lastrowid
                    cur.execute(alerts_sql, (id_leitura,))
                    alert_rows = list(cur.fetchall() or [])
                conn.commit()
        except pymysql.MySQLError as exc:
            _translate_mysql_error(exc, "leitura")

        for alert in alert_rows:
            alert["resolvido"] = bool(alert["resolvido"])

        return {
            "id_leitura": id_leitura,
            "id_painel": id_painel,
            "registrado_em": registrado_em,
            "energia_kwh": float(energia_kwh),
            "alertas_gerados": alert_rows,
        }

    # --- Alertas ---

    def list_alerts(
        self,
        cpf: str,
        resolvido: bool | None = None,
        id_painel: int | None = None,
        tipo_alerta: str | None = None,
    ) -> list[dict[str, Any]]:
        clauses = ["c.cpf_proprietario = %s"]
        params: list[Any] = [cpf]

        if resolvido is not None:
            clauses.append("a.resolvido = %s")
            params.append(resolvido)
        if id_painel is not None:
            clauses.append("a.id_painel = %s")
            params.append(id_painel)
        if tipo_alerta is not None:
            clauses.append("a.tipo_alerta = %s")
            params.append(tipo_alerta)

        where_sql = " AND ".join(clauses)
        sql = f"""
            SELECT a.id_alerta, a.id_painel, p.numero_serie, p.id_casa, c.nome AS nome_casa,
                   a.id_leitura, a.tipo_alerta, a.mensagem, a.resolvido, a.criado_em, a.resolvido_em
            FROM alertas a
            INNER JOIN paineis p ON p.id_painel = a.id_painel
            INNER JOIN casas c ON c.id_casa = p.id_casa
            WHERE {where_sql}
            ORDER BY a.resolvido ASC, a.criado_em DESC, a.id_alerta DESC
        """
        with self._connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, tuple(params))
                rows = cur.fetchall()
                for row in rows:
                    row["resolvido"] = bool(row["resolvido"])
                return rows

    def resolve_alert(self, id_alerta: int, cpf: str) -> dict[str, Any]:
        check_sql = """
            SELECT a.id_alerta
            FROM alertas a
            INNER JOIN paineis p ON p.id_painel = a.id_painel
            INNER JOIN casas c ON c.id_casa = p.id_casa
            WHERE a.id_alerta = %s AND c.cpf_proprietario = %s
        """
        update_sql = """
            UPDATE alertas
            SET resolvido = TRUE, resolvido_em = COALESCE(resolvido_em, NOW())
            WHERE id_alerta = %s
        """
        fetch_sql = """
            SELECT a.id_alerta, a.id_painel, p.numero_serie, p.id_casa, c.nome AS nome_casa,
                   a.id_leitura, a.tipo_alerta, a.mensagem, a.resolvido, a.criado_em, a.resolvido_em
            FROM alertas a
            INNER JOIN paineis p ON p.id_painel = a.id_painel
            INNER JOIN casas c ON c.id_casa = p.id_casa
            WHERE a.id_alerta = %s
        """
        with self._connection() as conn:
            with conn.cursor() as cur:
                cur.execute(check_sql, (id_alerta, cpf))
                if not cur.fetchone():
                    raise NotFoundError("Alerta não encontrado.")
                cur.execute(update_sql, (id_alerta,))
                cur.execute(fetch_sql, (id_alerta,))
                row = cur.fetchone()
            conn.commit()

        assert row is not None
        row["resolvido"] = bool(row["resolvido"])
        return row

    # --- Auditoria ---

    def log_audit(
        self,
        cpf_usuario: str,
        acao: str,
        tabela_alvo: str | None = None,
        id_alvo: str | None = None,
        detalhes: dict[str, Any] | str | None = None,
        endereco_ip: str | None = None,
    ) -> None:
        details_text = (
            json.dumps(detalhes, ensure_ascii=False, default=str)
            if isinstance(detalhes, dict)
            else detalhes
        )
        sql = """
            INSERT INTO logs_auditoria (
                cpf_usuario, acao, tabela_alvo, id_alvo, detalhes, endereco_ip, criado_em
            ) VALUES (%s, %s, %s, %s, %s, %s, NOW())
        """
        with self._connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    sql,
                    (cpf_usuario, acao, tabela_alvo, id_alvo, details_text, endereco_ip),
                )
            conn.commit()

    def list_audit_logs(
        self,
        cpf: str,
        acao: str | None = None,
        tabela_alvo: str | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        clauses = ["cpf_usuario = %s"]
        params: list[Any] = [cpf]

        if acao:
            clauses.append("acao = %s")
            params.append(acao)
        if tabela_alvo:
            clauses.append("tabela_alvo = %s")
            params.append(tabela_alvo)

        where_sql = " AND ".join(clauses)
        sql = f"""
            SELECT id_log, cpf_usuario, acao, tabela_alvo, id_alvo,
                   detalhes, endereco_ip, criado_em
            FROM logs_auditoria
            WHERE {where_sql}
            ORDER BY criado_em DESC, id_log DESC
            LIMIT %s
        """
        params.append(limit)

        with self._connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, tuple(params))
                return list(cur.fetchall() or [])
