# Database Command Guidelines

When running database commands, always use non-interactive flags to avoid interactive prompts. This prevents the CLI from waiting for user input.

## PostgreSQL (psql)

Use non-interactive flags with psql:

- Use `-c` flag for single commands: `psql -h localhost -U postgres -c "SELECT 1;"`
- Use `-f` flag for SQL files: `psql -h localhost -U postgres -f script.sql`
- Add `-t` flag to suppress headers/footers when parsing output
- Add `-q` flag for quiet mode (minimal output)
- Combine flags as needed: `psql -h localhost -U postgres -q -t -c "SELECT version();"`

Example patterns:
```bash
# Single query
psql -h localhost -U postgres -c "CREATE DATABASE catchup_db;"

# Multiple commands
psql -h localhost -U postgres -c "CREATE DATABASE catchup_db; CREATE SCHEMA public;"

# From file
psql -h localhost -U postgres -f migrations/001_init.sql

# With output parsing
psql -h localhost -U postgres -q -t -c "SELECT COUNT(*) FROM users;"
```

## General Principle

For any CLI tool that might enter interactive mode:
- Always use flags that run commands directly (e.g., `-c`, `-f`, `--run`)
- Avoid interactive prompts by providing all necessary input upfront
- Use quiet/minimal output flags when appropriate
- Just run the command without waiting for interactive input
