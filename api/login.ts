import {route} from "../src/lib/http.js";
import {login} from "../src/services/session.js";
export default {fetch:route({POST: req=>login(req)})};
