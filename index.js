const express = require('express')
const app = express()
const port = process.env.port || 6467
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
var cors = require('cors')
const SSLCommerzPayment = require('sslcommerz-lts')
app.use(cors())
app.use(express.json());
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sx3fx96.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
const store_id = process.env.DB_STOREID
const store_passwd = process.env.DB_PASSWORD
const is_live = false //true for live, false for sandbox
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const database = client.db("Ecommerce");
    const ProductCollection = database.collection("AllProducts2");
    const OrderCollection = database.collection("Order");
    const UserCollection=database.collection('UserCollection');
    const tran_id=new ObjectId().toString();
app.post('/Order',async(req,res)=>{
    const orderdata=req.body;
    const product=await ProductCollection.findOne({_id:new ObjectId(orderdata.productId)});
    const PriceInt=parseInt(product.price);
    const price=PriceInt*100
    
    console.log(orderdata); 
    const data = {
        total_amount: price,
        currency: orderdata.currency,
        tran_id: tran_id, // use unique tran_id for each api call
        success_url: `http://localhost:6467/payment/success/${tran_id}`,
        fail_url: `http://localhost:6467/payment/fail/${tran_id}`,
        cancel_url: 'http://localhost:3030/cancel',
        ipn_url: 'http://localhost:3030/ipn',
        shipping_method: 'Courier',
        product_name: 'Computer.',
        product_category: 'Electronic',
        product_profile: 'general',
        cus_name: 'Customer Name',
        cus_email: 'customer@example.com',
        cus_add1: orderdata.address,
        cus_add2: 'Dhaka',
        cus_city: 'Dhaka',
        cus_state: 'Dhaka',
        cus_postcode: orderdata.postcode,
        cus_country: 'Bangladesh',
        cus_phone: orderdata.phone,
        cus_fax: '01711111111',
        ship_name: orderdata.name,
        ship_add1: 'Dhaka',
        ship_add2: 'Dhaka',
        ship_city: 'Dhaka',
        ship_state: 'Dhaka',
        ship_postcode: 1000,
        ship_country: 'Bangladesh',
    };
    console.log(data);
    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
    sslcz.init(data).then(apiResponse => {
        // Redirect the user to payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL
        res.send({url:GatewayPageURL})
        console.log('Redirecting to: ', GatewayPageURL)
    });

    const orderDBCollection={ orderdata,paidStatus:false,transactionid:tran_id};
    const result=await OrderCollection.insertOne(orderDBCollection);
    // res.send(result);
})
app.post('/payment/success/:tran_id',async(req,res)=>{
    console.log(req.params.tran_id);
    const updatedata=await OrderCollection.updateOne({transactionid:req.params.tran_id},{
        $set:{
            paidStatus:true
        },
    })

    if(updatedata.modifiedCount>0){
        res.redirect(`http://localhost:5173/Payment/Success/${tran_id}`)
    }
    
})
app.post('/Payment/fail/:tran_id',async(req,res)=>{
    console.log(req.params.id)
    const deletedata=await OrderCollection.deleteOne({transactionid:req.params.tran_id});
    if(deletedata.deletedCount>0){
        res.redirect(`http://localhost:5173/Payment/Fail/${tran_id}`)

    }
})
app.post('/User',async(req,res)=>{
  const data=req.body;
  console.log(data);
  const result=await UserCollection.insertOne(data);
  res.send(result);
})
    app.get('/Products',async(req,res)=>{
        const result=await ProductCollection.find().toArray();
        console.log("Products", result);
        res.send(result)
    })
    app.get("/Product/:id",async(req,res)=>{
        const query=req.params.id;
        const result=await ProductCollection.findOne({_id:new ObjectId(query)})
        res.send(result);
    })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})