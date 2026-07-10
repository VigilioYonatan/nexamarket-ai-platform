import { check, sleep } from "k6";
import http from "k6/http";
export const options = {
  stages: [
    { duration: "30s", target: 10 },
    { duration: "2m", target: 30 },
    { duration: "30s", target: 0 },
  ],
  thresholds: { http_req_failed: ["rate<0.01"], http_req_duration: ["p(95)<750"] },
};
const host = __ENV.BASE_URL || "http://localhost:4000";
export default function () {
  const res = http.get(`${host}/api/v1/products?page=1`);
  check(res, { 200: (r) => r.status === 200, "has items": (r) => Array.isArray(r.json("items")) });
  sleep(1);
}
