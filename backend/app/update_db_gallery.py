import os
import sys
import psycopg2

def main():
    # PostgreSQL Credentials: password is Huttesh@2003 for user postgres
    conn = psycopg2.connect(
        dbname="friendzone",
        user="postgres",
        password="Huttesh@2003",
        host="localhost",
        port="5432"
    )
    conn.autocommit = True
    cursor = conn.cursor()

    try:
        # Add category column to photos table if it doesn't exist
        cursor.execute("ALTER TABLE photos ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Hangout';")
        print("Successfully added 'category' column to 'photos' table.")
    except Exception as e:
        print(f"Error modifying database: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    main()
