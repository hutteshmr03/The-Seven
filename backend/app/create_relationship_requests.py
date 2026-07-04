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
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS relationship_requests (
                id SERIAL PRIMARY KEY,
                sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                relation_type VARCHAR(50) NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        print("Successfully created 'relationship_requests' table in database.")
    except Exception as e:
        print(f"Error modifying database: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    main()
