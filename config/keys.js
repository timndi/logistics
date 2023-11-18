// module.exports= {
//     MongoDB: 'mongodb+srv://admin-intgranta:30int2admin@cluster0.nhyinh6.mongodb.net/?retryWrites=true&w=majority'
// };


if (process.env.NODE_ENV === 'production') {
    module.exports = require('./prod');
} else {
    module.exports = require('./dev');
}