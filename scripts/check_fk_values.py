import sqlite3

conn = sqlite3.connect('aperio.db')
c = conn.cursor()

print("Checking agent_executions disaster_event_id:")
res = c.execute("SELECT DISTINCT disaster_event_id FROM agent_executions").fetchall()
print("  Distinct disaster_event_id in agent_executions:", res)

print("\nChecking human_approvals alert_id and recommendation_id:")
res_alerts = c.execute("SELECT DISTINCT alert_id FROM human_approvals").fetchall()
res_recs = c.execute("SELECT DISTINCT recommendation_id FROM human_approvals").fetchall()
print("  Distinct alert_id in human_approvals:", res_alerts)
print("  Distinct recommendation_id in human_approvals:", res_recs)

# Also sample one row from agent_executions and human_approvals
c.row_factory = sqlite3.Row
sample_exec = dict(c.execute("SELECT * FROM agent_executions LIMIT 1").fetchone())
sample_appr = dict(c.execute("SELECT * FROM human_approvals LIMIT 1").fetchone())
print("\nSample agent_execution row:\n", sample_exec)
print("\nSample human_approval row:\n", sample_appr)
