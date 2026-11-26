import {route} from "../src/lib/http.js";import {currentSession} from "../src/services/session.js";export default {fetch:route({GET:currentSession})};
