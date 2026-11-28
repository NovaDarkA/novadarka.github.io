import {route} from "../src/lib/http.js";import {register} from "../src/services/session.js";export default {fetch:route({POST:req=>register(req)})};
