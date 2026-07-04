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
        cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS father_id INTEGER REFERENCES users(id) ON DELETE SET NULL;")
        cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS mother_id INTEGER REFERENCES users(id) ON DELETE SET NULL;")
        cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS spouse_id INTEGER REFERENCES users(id) ON DELETE SET NULL;")
        print("Successfully added family tree columns (father_id, mother_id, spouse_id) to 'users' table.")
    except Exception as e:
        print(f"Error modifying database: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    main()
