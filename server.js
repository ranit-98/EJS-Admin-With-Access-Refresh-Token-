const app=require('./app')
const express=require('express')
const cors=require('cors')

const dbConfig = require('./app/config/dbConfig')
const port=3005

dbConfig()
app.use(cors())
app.use(express.json())
app.listen(port,()=>{
    console.log("Server is running on port 3005")
})