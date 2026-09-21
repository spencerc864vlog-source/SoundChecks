/**
 * Seeds the database with sample users, concerts, reviews, follows, likes,
 * and comments so you have something to look at right after setup.
 *
 * Run with: npm run db:seed
 */
import "dotenv/config";
import { db, schema } from "./index";
import { hashPassword } from "../password";

async function main() {
  console.log("Seeding database…");

  const passwordHash = await hashPassword("password123");

  const [alex, jordan, sam] = await db
    .insert(schema.users)
    .values([
      {
        username: "alexr",
        email: "alex@example.com",
        displayName: "Alex Rivera",
        bio: "Front row or nothing. Based in Austin.",
        passwordHash,
      },
      {
        username: "jordanm",
        email: "jordan@example.com",
        displayName: "Jordan Mills",
        bio: "Festival season is a lifestyle.",
        passwordHash,
      },
      {
        username: "samk",
        email: "sam@example.com",
        displayName: "Sam Kim",
        bio: "Collecting setlists since 2015.",
        passwordHash,
      },
    ])
    .returning();

  const venuesData = [
    { name: "Radio City Music Hall", city: "New York", country: "USA" },
    { name: "The Gorge Amphitheatre", city: "George", country: "USA" },
    { name: "Kia Forum", city: "Inglewood", country: "USA" },
    { name: "Alexandra Palace", city: "London", country: "UK" },
  ];

  const [radioCity, gorge, kiaForum, alexandraPalace] = await db
    .insert(schema.venues)
    .values(venuesData)
    .returning();

  const concertsData = [
    {
      artist: "Fleet Foxes",
      tourName: "Shore Tour",
      venueId: radioCity.id,
      date: "2023-09-14",
      createdByUserId: alex.id,
    },
    {
      artist: "Tame Impala",
      tourName: "The Slow Rush Tour",
      venueId: gorge.id,
      date: "2022-08-27",
      createdByUserId: jordan.id,
    },
    {
      artist: "boygenius",
      tourName: "The Record Tour",
      venueId: kiaForum.id,
      date: "2023-10-20",
      createdByUserId: sam.id,
    },
    {
      artist: "Fred again..",
      tourName: "Actual Life Tour",
      venueId: alexandraPalace.id,
      date: "2023-03-03",
      createdByUserId: alex.id,
    },
  ];

  const concerts = await db.insert(schema.concerts).values(concertsData).returning();

  await db.insert(schema.venueRatings).values([
    { userId: alex.id, venueId: radioCity.id, rating: 10, body: "Best acoustics of any room I've been in." },
    { userId: jordan.id, venueId: gorge.id, rating: 10, body: "The view alone is worth the trip." },
  ]);

  const reviewsData = [
    {
      userId: alex.id,
      concertId: concerts[0].id,
      rating: 10,
      body: "Every harmony landed. Genuinely one of the best-sounding rooms I've seen a show in.",
    },
    {
      userId: jordan.id,
      concertId: concerts[0].id,
      rating: 8,
      body: "Beautiful set, wish they'd played a longer encore.",
    },
    {
      userId: jordan.id,
      concertId: concerts[1].id,
      rating: 9,
      body: "The Gorge at sunset during 'Eventually' is unbeatable.",
    },
    {
      userId: sam.id,
      concertId: concerts[2].id,
      rating: 10,
      body: "Cried three separate times. Absolutely worth the flight.",
    },
    {
      userId: alex.id,
      concertId: concerts[3].id,
      rating: 7,
      body: "Sound system fought the venue a little but the visuals carried it.",
    },
  ];

  const reviews = await db.insert(schema.reviews).values(reviewsData).returning();

  await db.insert(schema.topFour).values([
    { userId: alex.id, concertId: concerts[0].id, position: 1 },
    { userId: alex.id, concertId: concerts[3].id, position: 2 },
    { userId: jordan.id, concertId: concerts[1].id, position: 1 },
    { userId: sam.id, concertId: concerts[2].id, position: 1 },
  ]);

  await db.insert(schema.follows).values([
    { followerId: alex.id, followingId: jordan.id },
    { followerId: alex.id, followingId: sam.id },
    { followerId: jordan.id, followingId: alex.id },
  ]);

  await db.insert(schema.likes).values([
    { userId: jordan.id, reviewId: reviews[0].id },
    { userId: sam.id, reviewId: reviews[0].id },
  ]);

  await db.insert(schema.comments).values([
    { userId: sam.id, reviewId: reviews[0].id, body: "Wish I'd been there for this one." },
  ]);

  console.log("Done. Sample login: username 'alexr', password 'password123'.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
