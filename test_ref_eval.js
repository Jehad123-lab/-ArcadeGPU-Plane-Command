import { UT } from './test_ref_ut.js';
export function check() {
  try {
     console.log(UT);
  } catch (e) {
     console.log("Error inside check:", e);
  }
}
