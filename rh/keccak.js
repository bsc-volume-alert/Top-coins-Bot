// keccak256 of an event signature → topic0 (0x-prefixed)
import sha3 from "js-sha3";
export const keccak256 = (s) => "0x" + sha3.keccak256(s);
