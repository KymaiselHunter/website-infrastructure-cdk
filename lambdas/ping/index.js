exports.handler = async(event) => {
    console.log("recieved event: ", JSON.stringify(event, null, 2));
    return{
        statusCode: 200,
        headers: {"Content-Type" : "application/json"},
        body: JSON.stringify({ message : "pong"}),
    };
};

// Optional Local test
if (require.main === module)
{
    exports.handler({ httpMethod: 'GET', path: '/ping'}).then(console.log);
}