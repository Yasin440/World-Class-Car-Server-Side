const express = require("express");
const cors = require("cors");
const ObjectId = require('mongodb').ObjectId;
const { MongoClient } = require("mongodb");
const fileUpload = require('express-fileupload');
require("dotenv").config();
//script api secret key
const stripe = require("stripe")(process.env.STRIPE_SECRET);
//---------- app.use(express.static("public"));

const app = express();
const port = process.env.PORT || 4000

//middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nort6.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


async function run() {
    try {
        await client.connect();
        const database = client.db("cars-model");
        const carsCollection = database.collection("cars");
        const clientsCollection = database.collection('clients');
        const carOrdersCollection = database.collection('orderedCars');
        const clientsAllRating = database.collection('ratings');

        //== get api for client reviews ==//
        app.get('/reviews', async (req, res) => {
            const cursor = clientsAllRating.find({}).limit(6);
            const reviews = await cursor.toArray();
            res.send(reviews);
        })
        //== get api to get a email which is admin==//
        app.get('/client/isAdmin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await clientsCollection.findOne(query);
            let isAdmin = false;
            if (result?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        })

        //== GET app for 6 cars ==//
        app.get('/cars', async (req, res) => {
            const cursor = carsCollection.find({}).limit(6);
            const cars = await cursor.toArray();
            res.send(cars);
        })

        //GET app for all cars
        app.get('/cars/all', async (req, res) => {
            const cursor = carsCollection.find({});
            const cars = await cursor.toArray();
            res.send(cars);
        })

        //get api for all orders of car
        app.get('/orderedCars/all', async (req, res) => {
            const cursor = carOrdersCollection.find({});
            const allOrderedCars = await cursor.toArray();
            res.send(allOrderedCars);
        })

        //get api for orders with email Id
        app.get('/orderedCars/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const cursor = carOrdersCollection.find(query);
            const allMyOrderedCars = await cursor.toArray();
            res.send(allMyOrderedCars);
        })
        app.get('/orderedCars/payment/:_id', async (req, res) => {
            const id = req.params._id;
            const query = { _id: ObjectId(id) };
            const result = await carOrdersCollection.findOne(query);
            res.send(result);
        })

        //get api for one car doc with id query
        app.get('/carDetails/:_id', async (req, res) => {
            const id = req.params._id;
            const query = { _id: ObjectId(id) };
            const result = await carsCollection.findOne(query);
            res.send(result);
        })

        //POST API to add user through email and pass
        app.post('/clients', async (req, res) => {
            const client = req.body;
            const result = await clientsCollection.insertOne(client);
            res.json(result);
        })

        //***/== POST API to add ratings ==/***//

        app.post('/ratings', async (req, res) => {
            const rating = req.body;
            const result = await clientsAllRating.insertOne(rating);
            res.json(result);
        })

        //POST API to add cars in carsCollection
        app.post('/addCars', async (req, res) => {
            const clientName = req.body.clientName;
            const name = req.body.name;
            const email = req.body.email;
            const price = req.body.price;
            const details = req.body.details;
            const picture = req.body.picture;
            const picData = req.files.picture2.data;
            const encodedPic = picData.toString('base64');
            const imgBuffer = Buffer.from(encodedPic, 'base64');
            const newCar =
            {
                clientName, name, email, price, picture, picture2: imgBuffer, details
            }
            const result = await carsCollection.insertOne(newCar);
            res.json(result);
        })

        //----post api for add ordered cars details
        app.post('/orderedCars', async (req, res) => {
            const carOrders = req.body;
            const result = await carOrdersCollection.insertOne(carOrders);
            res.json(result)
        })

        //------put client through gmail or other authentication
        app.put('/clients', async (req, res) => {
            const client = req.body;
            const query = { email: client.email };
            const options = { upsert: true };
            const updateClient = { $set: client };
            const result = await clientsCollection.updateOne(query, updateClient, options);
            res.json(result);

        })

        //***/== Put api to update client admin role ==/***//
        app.put('/clients/makeAdmin', async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const updateDoc = { $set: { role: 'admin' } }
            const result = await clientsCollection.updateOne(query, updateDoc);
            res.json(result);

        })
        // put api to update order status
        app.put('/ordered_car/status/:_id', async (req, res) => {
            const id = req.params._id;
            const query = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: "approved"
                },
            }
            const result = await carOrdersCollection.updateOne(query, updateDoc);
            res.json(result);
        })
        // put api to update order payment status
        app.put('/ordered_car/payment_status/:_id', async (req, res) => {
            const id = req.params._id;
            const paymentInfo = req.body;
            console.log(paymentInfo);
            const query = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    status: "paid",
                    paymentInfo: paymentInfo,
                },
            }
            const result = await carOrdersCollection.updateOne(query, updateDoc, options);
            res.json(result);
        })

        //delete api to delete an order from all orders
        app.delete('/orderedCars/delete/:_id', async (req, res) => {
            const id = req.params._id;
            const query = { _id: ObjectId(id) };
            const result = await carOrdersCollection.deleteOne(query);
            res.json(result);
        })
        //delete api to delete one car from all cars
        app.delete('/all_Cars/delete/:_id', async (req, res) => {
            const id = req.params._id;
            const query = { _id: ObjectId(id) };
            const result = await carsCollection.deleteOne(query);
            res.json(result);
            console.log(result);
        })
        //payment post api with stripe
        app.post("/create-payment-intent", async (req, res) => {
            const paymentInfo = req.body;
            const amount = paymentInfo.price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                currency: "usd",
                amount: amount,
                payment_method_types: ["card"],
            })
            res.json({
                clientSecret: paymentIntent.client_secret,
            })
        })
    }
    finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('This a Server to Connect "World Class Car" with backEnd');
})
app.listen(port, () => {
    console.log('World Class Car is running on:', port);
})