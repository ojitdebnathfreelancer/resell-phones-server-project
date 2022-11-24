const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
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

const resell = async () =>{
    try{
        const categoryNameData = client.db('resellphones').collection('categoryName');
        const productsData = client.db('resellphones').collection('products');

        app.get('/categories', async(req, res)=>{
            const categoryName = await categoryNameData.find({}).toArray();
            res.send(categoryName);
        });
        // get all category name 

        app.get('/category/:id', async (req, res)=>{
            const id = req.params.id;
            const query ={category_id:id};
            const category = await productsData.find(query).toArray();
            res.send(category);
        });
    }
    finally{

    }
};
resell().catch(error => console.error(error));


app.listen(port, () => {
    console.log('server running', port)
});
