import {route} from "../src/lib/http.js";import {getProfile,updateProfile} from "../src/services/profile.js";export default {fetch:route({GET:r=>getProfile(r),PATCH:r=>updateProfile(r)})};
