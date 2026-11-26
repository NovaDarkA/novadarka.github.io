import {route} from "../src/lib/http.js";import {recover} from "../src/services/recovery.js";export default {fetch:route({POST:req=>recover(req)})};
