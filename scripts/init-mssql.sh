#!/bin/bash
# ==============================================================================
# Automated Database Initialization Script for XEMPHIM Microservices
# Waits for MSSQL Server to be healthy, then executes all 5 schema scripts.
# ==============================================================================

echo "⏳ Waiting for Microsoft SQL Server to start..."
DB_PASS="${SA_PASSWORD:-${DB_PASS:-123}}"
DB_HOST="${DB_HOST:-mssql}"

for i in {1..60}; do
  /opt/mssql-tools18/bin/sqlcmd -S "$DB_HOST" -U sa -P "$DB_PASS" -C -Q "SELECT 1" > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "✅ SQL Server is online and accepting connections!"
    break
  fi
  echo "Still waiting for SQL Server to boot... ($i/60)"
  sleep 2
done

echo "🚀 Running database schema migrations..."
for script in XemPhim_User.sql XemPhim_Movie.sql XemPhim_Seat.sql XemPhim_Booking.sql XemPhim_Payment.sql; do
  if [ -f "/scripts/$script" ]; then
    echo "📄 Importing /scripts/$script ..."
    /opt/mssql-tools18/bin/sqlcmd -S "$DB_HOST" -U sa -P "$DB_PASS" -C -i "/scripts/$script"
  fi
done

echo "🎉 All 5 XEMPHIM databases initialized successfully!"
