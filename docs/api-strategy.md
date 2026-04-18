// Success Response
{
"success": true,
"data": T,
"message": string,
"timestamp": string (ISO format)
}

// Paginated Response
{
"success": true,
"data": {
"data": T[],
"meta": {
"page": number,
"limit": number,
"total": number,
"totalPages": number,
"hasNextPage": boolean,
"hasPrevPage": boolean
}
},
"message": string,
"timestamp": string
}

// Error Response
{
"success": false,
"message": string,
"errors?: any,
"timestamp": string
}
