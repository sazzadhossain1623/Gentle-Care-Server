const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8tszh8q.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
  try {
    await client.connect();
    const serviceCollection = client.db('gentle_care').collection('services');
    const bookingCollection = client.db('gentle_care').collection('bookings');

    app.get('/service', async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });

    // WARNING :
    // This is the proper way to query
    // After learningmore about MongoDB . Use aggregate lookup, pipeline, match, group.
    app.get('/available', async (req, res) => {
      const date = req.query.date;
      // step one : get all services
      const services = await serviceCollection.find().toArray();
      // step two : get the booking of the date output: [{}, {}, {}, {} ..... {}]
      const query = { date: date };
      const bookings = await bookingCollection.find(query).toArray();
      // step three : for each service
      services.forEach(service => {
        // step four : find bookings for that service. output: [{}, {}, {}, {}]
        const serviceBookings = bookings.filter(book => book.treatment === service.name);
        // step five : select slots for the serviceBookings: ['', '', '', '']
        const bookedSlots = serviceBookings.map(book => book.slot);
        // step six : select those slots that are not in the bookedSlots
        const availableSlots = service.slots.filter(slot => !bookedSlots.includes(slot));
        // step seven : set available to slots to make it easier
        service.slots = availableSlots;
      })

      res.send(services);
    });

    /** 
     * API Naming Convention
     * app.get(''/booking) // get all bookings in this collection or get more than one or by filter query
     * app.get(''/booking/:id) // get a specific booking
     * app.post(''/booking) // add a new booking
     * app.patch('/booking/:id') // Update a specific booking
     * app.delete('/booking/:id') // Delete a specific booking
    */

    app.post('/booking', async (req, res) => {
      const booking = req.body;
      const query = {
        treatment: booking.treatment,
        date: booking.date,
        patient: booking.patient
      }
      const bookingExists = await bookingCollection.findOne(query);
      if (bookingExists) {
        return res.send({ success: false, booking: bookingExists });
      }
      const result = await bookingCollection.insertOne(booking);
      return res.send({ success: true, result });
    });

  }
  finally {

  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello from Gentle Care!!')
})

app.listen(port, () => {
  console.log(`Gentle Care listening on port ${port}`)
})