
//below code explain at bottom 
const asyncHandler = (requestHandler) =>{
    return (req,res,next) =>{
        Promise.resolve(requestHandler(req,res,next))
        .catch((err) => next((err)))
    }
}

export {asyncHandler};

// const asyncHanlderTwo = (fn) => async (req,res,next) => {
//     try {
//         await fn(req,res,next);
//     } catch (error) {
//         res.status(500).json({
//             success:false,
//             error:error.message
//         })
//     }
// }

// A utility function that wraps async route handlers
// This helps to catch errors and respond with a custom JSON error message
// const asyncHandlerTwo = (fn) => 
//     async (req, res, next) => {
//       try {
//         // Try executing the async function (your route handler)
//         await fn(req, res, next);
//       } catch (error) {
//         // If any error is thrown during execution, catch it here
  
//         // Respond with HTTP status 500 (Internal Server Error)
//         res.status(500).json({
//           success: false,           // Indicates failure
//           error: error.message      // Sends the error message for debugging
//         });
//       }
//     };
  


// asyncHandler is a higher-order function that takes an async request handler
// const asyncHandler = (requestHandler) => {
//     // It returns a new function that takes the standard Express parameters: req, res, and next
//     return (req, res, next) => {
//       // Promise.resolve ensures that even if the requestHandler doesn't return a promise, it is still handled as one
//       // If the promise is rejected (i.e., an error is thrown), it will be caught by .catch()
//       Promise.resolve(requestHandler(req, res, next)).catch((err) => {
//         // Any caught error is passed to the next() function
//         // This triggers Express's built-in error handling middleware
//         next(err);
//       });
//     };
//   };
  
//   // Exporting the asyncHandler function so it can be used in other files
//   export { asyncHandler };
  