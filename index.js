const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Resell phones server is running')
});
// default api for check  

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.r7d25w3.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const jwtVerify = (req, res, netx) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).send({ message: "You have not access token" })
    }
    const Mtoken = token.split(' ')[1];
    jwt.verify(Mtoken, process.env.ACCESS_TOKEN, (error, decoded) => {
        if (error) {
            return res.status(403).send("Your access forbiden for error")
        }
        req.decoded = decoded;
    })
    netx()
};
// jwt verification 

const resell = async () => {
    try {
        const categoryNameData = client.db('resellphones').collection('categoryName');
        const productsData = client.db('resellphones').collection('products');
        const bookingsData = client.db('resellphones').collection('bookings');
        const usersData = client.db('resellphones').collection('users');

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1d' });
            res.send({ token });
        });
        // jwt token sign to client side 

        const adminVerify = async (req, res, next) => {
            const email = req.decoded.email;
            const query = {email: email};
            const user = await usersData.findOne(query);
            console.log(user);
            if(user.role !== "admin"){
                return res.status(403).send('Your are not a admin, forbiden access')
            }
                next()
        };
        // admin veify 

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersData.insertOne(user);
            res.send(result);
        });
        // save user to bd 

        app.get('/categories', async (req, res) => {
            const categoryName = await categoryNameData.find({}).toArray();
            res.send(categoryName);
        });
        // get all category name 

        app.get('/category/:id', jwtVerify, async (req, res) => {
            const id = req.params.id;
            const query = { category_id: id };
            const category = await productsData.find(query).toArray();
            res.send(category);
        });
        // get category ways data 

        app.post('/booking', async (req, res) => {
            const booked = req.body;
            const result = await bookingsData.insertOne(booked);
            res.send(result);
        });
        // booking product save to db

        app.get('/booking', jwtVerify, async (req, res) => {
            const email = req.query.email;
            const query = { buyerEmail: email };
            const booked = await bookingsData.find(query).toArray();
            res.send(booked);
        });
        // get user all booked 
    }
    finally {

    }
};
resell().catch(error => console.error(error));


app.listen(port, () => {
    console.log('server running', port)
});
