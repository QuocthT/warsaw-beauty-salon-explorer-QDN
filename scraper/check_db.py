from db import get_connection

with get_connection() as conn:
    # Total booksy records
    total = conn.execute("SELECT COUNT(*) FROM salons WHERE source='booksy'").fetchone()[0]
    print(f'Booksy records: {total}')

    # Sample 5 records
    rows = conn.execute("SELECT name, district, rating, price_range, services FROM salons WHERE source='booksy' LIMIT 5").fetchall()
    print()
    print('Sample records:')
    for r in rows:
        print(f'  {r[0]} | {r[1]} | rating={r[2]} | price={r[3]} | services={r[4][:50] if r[4] else None}')

    # Check how many have ratings
    with_rating = conn.execute("SELECT COUNT(*) FROM salons WHERE source='booksy' AND rating IS NOT NULL").fetchone()[0]
    with_price  = conn.execute("SELECT COUNT(*) FROM salons WHERE source='booksy' AND price_range IS NOT NULL").fetchone()[0]
    with_phone  = conn.execute("SELECT COUNT(*) FROM salons WHERE source='booksy' AND phone IS NOT NULL").fetchone()[0]
    print()
    print(f'With rating:     {with_rating}/{total}')
    print(f'With price range:{with_price}/{total}')
    print(f'With phone:      {with_phone}/{total}')

    # Districts covered
    districts = conn.execute("SELECT district, COUNT(*) as n FROM salons WHERE source='booksy' GROUP BY district ORDER BY n DESC").fetchall()
    print()
    print('By district:')
    for d in districts:
        print(f'  {d[0]:<25} {d[1]}')