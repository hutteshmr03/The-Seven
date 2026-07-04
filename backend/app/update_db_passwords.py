import psycopg2

def main():
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
        cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed BOOLEAN DEFAULT TRUE;")
        print("Successfully added 'password_changed' column to 'users' table.")
    except Exception as e:
        print(f"Error modifying database: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    main()
