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

  const [fleetFoxes, tameImpala, boygenius, fredAgain] = await db
    .insert(schema.artists)
    .values([{ name: "Fleet Foxes" }, { name: "Tame Impala" }, { name: "boygenius" }, { name: "Fred again.." }])
    .returning();

  const concertsData = [
    {
      artist: "Fleet Foxes",
      artistId: fleetFoxes.id,
      tourName: "Shore Tour",
      venueId: radioCity.id,
      date: "2023-09-14",
      createdByUserId: alex.id,
    },
    {
      artist: "Tame Impala",
      artistId: tameImpala.id,
      tourName: "The Slow Rush Tour",
      venueId: gorge.id,
      date: "2022-08-27",
      createdByUserId: jordan.id,
    },
    {
      artist: "boygenius",
      artistId: boygenius.id,
      tourName: "The Record Tour",
      venueId: kiaForum.id,
      date: "2023-10-20",
      createdByUserId: sam.id,
    },
    {
      artist: "Fred again..",
      artistId: fredAgain.id,
      tourName: "Actual Life Tour",
      venueId: alexandraPalace.id,
      date: "2023-03-03",
      createdByUserId: alex.id,
    },
  ];

  const concerts = await db.insert(schema.concerts).values(concertsData).returning();

  await db.insert(schema.artistRatings).values([
    { userId: alex.id, artistId: fleetFoxes.id, rating: 10, body: "Live harmonies are even better than the records." },
    { userId: sam.id, artistId: boygenius.id, rating: 10, body: "No notes. Perfect band." },
  ]);

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

  const [festivalList] = await db
    .insert(schema.lists)
    .values([{ userId: alex.id, title: "Best sound of 2023", description: "Rooms and rigs that got it right." }])
    .returning();

  await db.insert(schema.listItems).values([
    { listId: festivalList.id, concertId: concerts[0].id, position: 1 },
    { listId: festivalList.id, concertId: concerts[2].id, position: 2 },
  ]);

  await db.insert(schema.wantToGo).values([
    {
      userId: alex.id,
      ticketmasterEventId: "seed-event-1",
      eventName: "boygenius — The Record Tour",
      eventDate: "2027-05-01",
      venueName: "Kia Forum",
      city: "Inglewood",
      eventUrl: "https://www.ticketmaster.com/",
    },
  ]);

  await db.insert(schema.notifications).values([
    { userId: alex.id, actorId: jordan.id, type: "follow" },
    { userId: alex.id, actorId: sam.id, type: "like", reviewId: reviews[0].id },
    { userId: alex.id, actorId: sam.id, type: "comment", reviewId: reviews[0].id },
  ]);

  console.log("Done. Sample login: username 'alexr', password 'password123'.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
