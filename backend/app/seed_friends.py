import psycopg2
from app.auth import hash_password

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

    # Friends to seed
    friends = [
        ("hughie@gmail.com", "Hughie", "Hughie Campbell", "Dossier profile for Hughie.", 1),
        ("butcher@gmail.com", "Butcher", "Billy Butcher", "Dossier profile for Billy Butcher.", 2),
        ("starlight@gmail.com", "Starlight", "Annie January", "Dossier profile for Starlight.", 3),
        ("homelander@gmail.com", "Homelander", "John Gillman", "Dossier profile for Homelander.", 4),
        ("frenchie@gmail.com", "Frenchie", "Serge", "Dossier profile for Frenchie.", 5),
        ("kimiko@gmail.com", "Kimiko", "Kimiko Miyashiro", "Dossier profile for Kimiko.", 6)
    ]

    try:
        # Check if users already exist
        cursor.execute("SELECT COUNT(*) FROM users WHERE is_leader = FALSE;")
        count = cursor.fetchone()[0]
        
        if count == 0:
            for email, nick, full, about, order in friends:
                hashed = hash_password("Password123")
                cursor.execute("""
                    INSERT INTO users (username, hashed_password, nickname, full_name, about_me, is_leader, sort_order, password_changed, created_at)
                    VALUES (%s, %s, %s, %s, %s, FALSE, %s, FALSE, NOW());
                """, (email, hashed, nick, full, about, order))
            print("Successfully seeded 6 friends into the database.")
        else:
            print("Friends database already contains records. Skipping seed.")
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    main()
