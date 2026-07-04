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
        cursor.execute("ALTER TABLE memories ADD COLUMN IF NOT EXISTS location VARCHAR(200);")
        print("Successfully added 'location' column to 'memories' table.")
    except Exception as e:
        print(f"Error modifying database: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    main()
