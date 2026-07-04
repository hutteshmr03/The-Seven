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
        alter_query = """
        ALTER TABLE users ADD COLUMN IF NOT EXISTS father_name VARCHAR;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS father_photo VARCHAR;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS mother_name VARCHAR;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS mother_photo VARCHAR;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS spouse_name VARCHAR;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS spouse_photo VARCHAR;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS father_father_name VARCHAR;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS father_father_photo VARCHAR;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS father_mother_name VARCHAR;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS father_mother_photo VARCHAR;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS mother_father_name VARCHAR;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS mother_father_photo VARCHAR;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS mother_mother_name VARCHAR;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS mother_mother_photo VARCHAR;
        """
        cursor.execute(alter_query)
        print("Database schema updated with custom family tree columns successfully.")
    except Exception as e:
        print(f"Error modifying database: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    main()
