### Request 1 — Get post 1

**Command:**

```bash
curl -i https://jsonplaceholder.typicode.com/posts/1



HTTP/2 200 
date: Sun, 16 Aug 2026 12:53:40 GMT
content-type: application/json; charset=utf-8
content-length: 292
access-control-allow-credentials: true
cache-control: max-age=43200
etag: W/"124-yiKdLzqO5gfBrJFrcdJ8Yq0LGnU"
expires: -1
nel: {"report_to":"heroku-nel","response_headers":["Via"],"max_age":3600,"success_fraction":0.01,"failure_fraction":0.1}
pragma: no-cache
report-to: {"group":"heroku-nel","endpoints":[{"url":"https://nel.heroku.com/reports?s=QwcX6nLtJ2b6%2BABQIX1mfYF8MxKJ69sRv8nTGsMQs8o%3D\u0026sid=e11707d5-02a7-43ef-b45e-2cf4d2036f7d\u0026ts=1785189191"}],"max_age":3600}
reporting-endpoints: heroku-nel="https://nel.heroku.com/reports?s=QwcX6nLtJ2b6%2BABQIX1mfYF8MxKJ69sRv8nTGsMQs8o%3D&sid=e11707d5-02a7-43ef-b45e-2cf4d2036f7d&ts=1785189191"
server: cloudflare
vary: Origin, Accept-Encoding
via: 2.0 heroku-router
x-content-type-options: nosniff
x-powered-by: Express
x-ratelimit-limit: 1000
x-ratelimit-remaining: 999
x-ratelimit-reset: 1785189203
age: 15242
accept-ranges: bytes
cf-cache-status: HIT
cf-ray: a2c0954fbdb4e1d4-MRS
alt-svc: h3=":443"; ma=86400

{
  "userId": 1,
  "id": 1,
  "title": "sunt aut facere repellat provident occaecati excepturi optio reprehenderit",
  "body": "quia et suscipit\nsuscipit recusandae consequuntur expedita et cum\nreprehenderit molestiae ut ut quas totam\nnostrum rerum est autem sunt rem eveniet architecto"
}



---

# Request 2

Run:

```bash
curl -i https://jsonplaceholder.typicode.com/posts/2



HTTP/2 200 
date: Sun, 16 Aug 2026 12:59:50 GMT
content-type: application/json; charset=utf-8
content-length: 278
access-control-allow-credentials: true
cache-control: max-age=43200
etag: W/"116-jnDuMpjju89+9j7e0BqkdFsVRjs"
expires: -1
nel: {"report_to":"heroku-nel","response_headers":["Via"],"max_age":3600,"success_fraction":0.01,"failure_fraction":0.1}
pragma: no-cache
report-to: {"group":"heroku-nel","endpoints":[{"url":"https://nel.heroku.com/reports?s=DQc1u5AvQoqrvqc6sfLnahV62O2FOj4iq65Y%2FxQec0w%3D\u0026sid=e11707d5-02a7-43ef-b45e-2cf4d2036f7d\u0026ts=1786871011"}],"max_age":3600}
reporting-endpoints: heroku-nel="https://nel.heroku.com/reports?s=DQc1u5AvQoqrvqc6sfLnahV62O2FOj4iq65Y%2FxQec0w%3D&sid=e11707d5-02a7-43ef-b45e-2cf4d2036f7d&ts=1786871011"
server: cloudflare
vary: Origin, Accept-Encoding
via: 2.0 heroku-router
x-content-type-options: nosniff
x-powered-by: Express
x-ratelimit-limit: 1000
x-ratelimit-remaining: 999
x-ratelimit-reset: 1786871022
age: 14178
accept-ranges: bytes
cf-cache-status: HIT
cf-ray: a2c09e578955b698-MRS
alt-svc: h3=":443"; ma=86400

{
  "userId": 1,
  "id": 2,
  "title": "qui est esse",
  "body": "est rerum tempore vitae\nsequi sint nihil reprehenderit dolor beatae ea dolores neque\nfugiat blanditiis voluptate porro vel nihil molestiae ut reiciendis\nqui aperiam non debitis possimus qui neque nisi nulla"
}


---

# Request 3

Run:

```bash
curl -i https://jsonplaceholder.typicode.com/users/1

HTTP/2 200 
date: Sun, 16 Aug 2026 13:02:09 GMT
content-type: application/json; charset=utf-8
content-length: 509
access-control-allow-credentials: true
cache-control: max-age=43200
etag: W/"1fd-+2Y3G3w049iSZtw5t1mzSnunngE"
expires: -1
nel: {"report_to":"heroku-nel","response_headers":["Via"],"max_age":3600,"success_fraction":0.01,"failure_fraction":0.1}
pragma: no-cache
report-to: {"group":"heroku-nel","endpoints":[{"url":"https://nel.heroku.com/reports?s=N7YoLGTyB4ARhV58I%2FQJGNOu9YOel1nlPCK%2FBLtZLH8%3D\u0026sid=e11707d5-02a7-43ef-b45e-2cf4d2036f7d\u0026ts=1786823141"}],"max_age":3600}
reporting-endpoints: heroku-nel="https://nel.heroku.com/reports?s=N7YoLGTyB4ARhV58I%2FQJGNOu9YOel1nlPCK%2FBLtZLH8%3D&sid=e11707d5-02a7-43ef-b45e-2cf4d2036f7d&ts=1786823141"
server: cloudflare
vary: Origin, Accept-Encoding
via: 2.0 heroku-router
x-content-type-options: nosniff
x-powered-by: Express
x-ratelimit-limit: 1000
x-ratelimit-remaining: 871
x-ratelimit-reset: 1786823143
age: 2557
accept-ranges: bytes
cf-cache-status: HIT
cf-ray: a2c0a1bfdd9dc611-MRS
alt-svc: h3=":443"; ma=86400

{
  "id": 1,
  "name": "Leanne Graham",
  "username": "Bret",
  "email": "Sincere@april.biz",
  "address": {
    "street": "Kulas Light",
    "suite": "Apt. 556",
    "city": "Gwenborough",
    "zipcode": "92998-3874",
    "geo": {
      "lat": "-37.3159",
      "lng": "81.1496"
    }
  },
  "phone": "1-770-736-8031 x56442",
  "website": "hildegard.org",
  "company": {
    "name": "Romaguera-Crona",
    "catchPhrase": "Multi-layered client-server neural-net",
    "bs": "harness real-time e-markets"
  }
}

# Request 4

HTTP/2 200 
date: Sun, 16 Aug 2026 13:00:50 GMT
content-type: application/json; charset=utf-8
content-length: 509
access-control-allow-credentials: true
cache-control: max-age=43200
etag: W/"1fd-+2Y3G3w049iSZtw5t1mzSnunngE"
expires: -1
nel: {"report_to":"heroku-nel","response_headers":["Via"],"max_age":3600,"success_fraction":0.01,"failure_fraction":0.1}
pragma: no-cache
report-to: {"group":"heroku-nel","endpoints":[{"url":"https://nel.heroku.com/reports?s=N7YoLGTyB4ARhV58I%2FQJGNOu9YOel1nlPCK%2FBLtZLH8%3D\u0026sid=e11707d5-02a7-43ef-b45e-2cf4d2036f7d\u0026ts=1786823141"}],"max_age":3600}
reporting-endpoints: heroku-nel="https://nel.heroku.com/reports?s=N7YoLGTyB4ARhV58I%2FQJGNOu9YOel1nlPCK%2FBLtZLH8%3D&sid=e11707d5-02a7-43ef-b45e-2cf4d2036f7d&ts=1786823141"
server: cloudflare
vary: Origin, Accept-Encoding
via: 2.0 heroku-router
x-content-type-options: nosniff
x-powered-by: Express
x-ratelimit-limit: 1000
x-ratelimit-remaining: 871
x-ratelimit-reset: 1786823143
age: 2478
accept-ranges: bytes
cf-cache-status: HIT
cf-ray: a2c09fd008bff4c0-MRS
alt-svc: h3=":443"; ma=86400

{
  "id": 1,
  "name": "Leanne Graham",
  "username": "Bret",
  "email": "Sincere@april.biz",
  "address": {
    "street": "Kulas Light",
    "suite": "Apt. 556",
    "city": "Gwenborough",
    "zipcode": "92998-3874",
    "geo": {
      "lat": "-37.3159",
      "lng": "81.1496"
    }
  },
  "phone": "1-770-736-8031 x56442",
  "website": "hildegard.org",
  "company": {
    "name": "Romaguera-Crona",
    "catchPhrase": "Multi-layered client-server neural-net",
    "bs": "harness real-time e-markets"
  }
}

# curl -i https://jsonplaceholder.typicode.com/users/1
# Request 5 

HTTP/2 200 
date: Sun, 16 Aug 2026 13:02:09 GMT
content-type: application/json; charset=utf-8
content-length: 509
access-control-allow-credentials: true
cache-control: max-age=43200
etag: W/"1fd-+2Y3G3w049iSZtw5t1mzSnunngE"
expires: -1
nel: {"report_to":"heroku-nel","response_headers":["Via"],"max_age":3600,"success_fraction":0.01,"failure_fraction":0.1}
pragma: no-cache
report-to: {"group":"heroku-nel","endpoints":[{"url":"https://nel.heroku.com/reports?s=N7YoLGTyB4ARhV58I%2FQJGNOu9YOel1nlPCK%2FBLtZLH8%3D\u0026sid=e11707d5-02a7-43ef-b45e-2cf4d2036f7d\u0026ts=1786823141"}],"max_age":3600}
reporting-endpoints: heroku-nel="https://nel.heroku.com/reports?s=N7YoLGTyB4ARhV58I%2FQJGNOu9YOel1nlPCK%2FBLtZLH8%3D&sid=e11707d5-02a7-43ef-b45e-2cf4d2036f7d&ts=1786823141"
server: cloudflare
vary: Origin, Accept-Encoding
via: 2.0 heroku-router
x-content-type-options: nosniff
x-powered-by: Express
x-ratelimit-limit: 1000
x-ratelimit-remaining: 871
x-ratelimit-reset: 1786823143
age: 2557
accept-ranges: bytes
cf-cache-status: HIT
cf-ray: a2c0a1bfdd9dc611-MRS
alt-svc: h3=":443"; ma=86400

{
  "id": 1,
  "name": "Leanne Graham",
  "username": "Bret",
  "email": "Sincere@april.biz",
  "address": {
    "street": "Kulas Light",
    "suite": "Apt. 556",
    "city": "Gwenborough",
    "zipcode": "92998-3874",
    "geo": {
      "lat": "-37.3159",
      "lng": "81.1496"
    }
  },
  "phone": "1-770-736-8031 x56442",
  "website": "hildegard.org",
  "company": {
    "name": "Romaguera-Crona",
    "catchPhrase": "Multi-layered client-server neural-net",
    "bs": "harness real-time e-markets"
  }
}

#curl -i https://jsonplaceholder.typicode.com/todos/1
# Request 6


HTTP/2 200 
date: Sun, 16 Aug 2026 13:03:02 GMT
content-type: application/json; charset=utf-8
content-length: 83
access-control-allow-credentials: true
cache-control: max-age=43200
etag: W/"53-hfEnumeNh6YirfjyjaujcOPPT+s"
expires: -1
nel: {"report_to":"heroku-nel","response_headers":["Via"],"max_age":3600,"success_fraction":0.01,"failure_fraction":0.1}
pragma: no-cache
report-to: {"group":"heroku-nel","endpoints":[{"url":"https://nel.heroku.com/reports?s=tFFNkMQskz2x8L3%2FL3ckNe49qRSLuq06uKN0W2earNY%3D\u0026sid=e11707d5-02a7-43ef-b45e-2cf4d2036f7d\u0026ts=1778557529"}],"max_age":3600}
reporting-endpoints: heroku-nel="https://nel.heroku.com/reports?s=tFFNkMQskz2x8L3%2FL3ckNe49qRSLuq06uKN0W2earNY%3D&sid=e11707d5-02a7-43ef-b45e-2cf4d2036f7d&ts=1778557529"
server: cloudflare
vary: Origin, Accept-Encoding
via: 2.0 heroku-router
x-content-type-options: nosniff
x-powered-by: Express
x-ratelimit-limit: 1000
x-ratelimit-remaining: 999
x-ratelimit-reset: 1778557578
age: 0
accept-ranges: bytes
cf-cache-status: HIT
cf-ray: a2c0a306ddabe28e-MRS
alt-svc: h3=":443"; ma=86400

{
  "userId": 1,
  "id": 1,
  "title": "delectus aut autem",
  "completed": false
}



# curl -i https://jsonplaceholder.typicode.com/posts/999999
# Request 7


server: cloudflare
vary: Origin, Accept-Encoding
via: 2.0 heroku-router
x-content-type-options: nosniff
x-powered-by: Express
x-ratelimit-limit: 1000
x-ratelimit-remaining: 999
x-ratelimit-reset: 1778557578
age: 0
accept-ranges: bytes
cf-cache-status: HIT
cf-ray: a2c0a306ddabe28e-MRS
alt-svc: h3=":443"; ma=86400

{
  "userId": 1,
  "id": 1,
  "title": "delectus aut autem",
  "completed": false
}

#HTTP/2 404
#content-type: application/json; charset=utf-8
...

HTTP/2 404. -------> 404 respose 
date: Sun, 16 Aug 2026 13:04:28 GMT
content-type: application/json; charset=utf-8
content-length: 2
access-control-allow-credentials: true
cache-control: max-age=43200
etag: W/"2-vyGp6PvFo4RvsFtPoIWeCReyIC8"
expires: -1
nel: {"report_to":"heroku-nel","response_headers":["Via"],"max_age":3600,"success_fraction":0.01,"failure_fraction":0.1}
pragma: no-cache
report-to: {"group":"heroku-nel","endpoints":[{"url":"https://nel.heroku.com/reports?s=LO%2B7i8pvNYugFYe3bbNIwfzuF7QRdh5InK0ULkM3HLk%3D\u0026sid=e11707d5-02a7-43ef-b45e-2cf4d2036f7d\u0026ts=1786876794"}],"max_age":3600}
reporting-endpoints: heroku-nel="https://nel.heroku.com/reports?s=LO%2B7i8pvNYugFYe3bbNIwfzuF7QRdh5InK0ULkM3HLk%3D&sid=e11707d5-02a7-43ef-b45e-2cf4d2036f7d&ts=1786876794"
server: cloudflare
vary: Origin, Accept-Encoding
via: 2.0 heroku-router
x-content-type-options: nosniff
x-powered-by: Express
x-ratelimit-limit: 1000
x-ratelimit-remaining: 999
x-ratelimit-reset: 1786876845
age: 8674
cf-cache-status: HIT
cf-ray: a2c0a524afecace6-MRS
alt-svc: h3=":443"; ma=86400

{}