export function check() {
  try {
     console.log(UT);
  } catch (e) {
     console.log("Error inside check:", e.name, e.message);
  }
}
