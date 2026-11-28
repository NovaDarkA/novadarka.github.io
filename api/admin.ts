import {route} from "../src/lib/http.js";import {manage} from "../src/services/admin.js";export default {fetch:route({GET:r=>manage(r),POST:r=>manage(r),PATCH:r=>manage(r),DELETE:r=>manage(r)})};
