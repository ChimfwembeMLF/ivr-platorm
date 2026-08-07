# Infrastructure Contracts

## Docker Compose Network
- **Network Name**: `ivr_network`
- **Driver**: `bridge`

## Services
1. **db**
   - Image: `postgres:15-alpine`
   - Port: `5432:5432`
   - Data Volume: `pg_data`
2. **redis**
   - Image: `redis:7-alpine`
   - Port: `6379:6379`
3. **asterisk**
   - Build Context: `./asterisk`
   - Port: `5060:5060/udp`, `10000-10099:10000-10099/udp`

## Backend Environment Variables
- `DATABASE_URL`: Connection string to postgres.
- `REDIS_URL`: Connection string to redis.
- `ASTERISK_AGI_HOST`: 0.0.0.0
- `ASTERISK_AGI_PORT`: 4573
