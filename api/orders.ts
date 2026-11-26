import {route} from "../src/lib/http.js";import {myOrders} from "../src/services/orders.js";export default {fetch:route({GET:r=>myOrders(r)})};
