db.createUser(
    {
        user: "admin",
        pwd: "admin",
        roles: [
            {
                role: "readWrite",
                db: "scanner"
            }
        ]
    }
);

db = new Mongo().getDB("scanner");

db.createCollection('requests', { capped: false });
db.createCollection('responses', { capped: false });
