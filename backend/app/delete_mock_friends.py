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
        # Delete all users that are not the leader
        cursor.execute("DELETE FROM users WHERE is_leader = FALSE;")
        print("Successfully deleted all mock friend accounts from the database.")
    except Exception as e:
        print(f"Error modifying database: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    main()
