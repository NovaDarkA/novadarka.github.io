import {route} from "../src/lib/http.js";import {logout} from "../src/services/session.js";export default {fetch:route({POST:logout})};
