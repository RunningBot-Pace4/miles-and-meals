import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

class Element {
  value = ""; textContent = ""; innerHTML = ""; hidden = false; type = ""; className = ""; checked = false;
  children: Element[] = []; style: Record<string,string> = {}; attributes: Record<string,string> = {};
  listeners: Record<string,Function[]> = {};
  classList = { toggle() {}, add() {}, remove() {} };
  setAttribute(key:string,value:string) { this.attributes[key]=value; }
  addEventListener(event:string,fn:Function) { (this.listeners[event]??=[]).push(fn); }
  append(...children:Element[]) { this.children.push(...children); }
  replaceChildren(...children:Element[]) { this.children=children; if(children[0]?.type === "option") this.value=children[0].value; }
  fire(event:string) { for(const fn of this.listeners[event]??[]) fn({target:this,preventDefault(){}}); }
}
function setup() {
  const packs=[{version:3,currentUserId:"me",savedAt:"2026-09-11",trip:{id:"vietnam",name:"Vietnam Trip",destination:"Vietnam",countryId:"vn",currencyCode:"VND",baseCurrency:"MYR",defaultExchangeRate:0.00017},members:[{id:"me",name:"Me"},{id:"a",name:"A"}]}, {version:3,currentUserId:"me",savedAt:"2026-09-11",trip:{id:"kota",name:"Kota Trip",destination:"Malaysia",countryId:"my",currencyCode:"MYR",baseCurrency:"MYR",defaultExchangeRate:1},members:[{id:"me",name:"Me"},{id:"b",name:"B"}]}];
  const storage=new Map([["mnm:offline-packs:v3",JSON.stringify(packs)]]);
  const nodes=new Map<string,Element>(); const get=(id:string)=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id)!;};
  const localStorage={getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>{storage.set(key,value);},removeItem:(key:string)=>{storage.delete(key);}};
  const script=readFileSync("public/offline.html","utf8").split("<script>")[1].split("</script>")[0];
  runInNewContext(script,{localStorage,document:{getElementById:get,createElement:(type:string)=>{const el=new Element();el.type=type;return el;}},navigator:{onLine:false},window:{addEventListener(){}},location:{href:""},crypto:{randomUUID:()=>"new-expense"}});
  return {get,storage,localStorage};
}
describe("standalone offline trip switching",()=>{
  it("switches the heading, currency and saved selection using the dropdown",()=>{
    const {get,storage}=setup();get("saved-trip").value="kota";get("saved-trip").fire("input");get("saved-trip").fire("change");
    expect(get("trip-name").textContent).toBe("Kota Trip");expect(get("currency").value).toBe("MYR");expect(storage.get("mnm:offline-selected-trip:v1")).toBe("kota");
  });
  it("switches with a visible button and queues the expense to that trip's members and currency",()=>{
    const {get,storage}=setup();get("trip-buttons").children[1].fire("click");get("description").value="Dinner";get("amount").value="20";get("quick-form").fire("submit");
    const queue=JSON.parse(storage.get("mnm:offline-mutation-queue:v1")!);
    expect(queue[0].body.countryId).toBe("my");expect(queue[0].body.transactionCurrency).toBe("MYR");expect(queue[0].body.splits.map((x:any)=>x.userId)).toEqual(["me","b"]);
  });
  it("keeps unfinished amounts separate between trips",()=>{
    const {get}=setup();get("description").value="Vietnam lunch";get("amount").value="100000";get("trip-buttons").children[1].fire("click");
    expect(get("amount").value).toBe("");get("trip-buttons").children[0].fire("click");expect(get("amount").value).toBe("100000");expect(get("description").value).toBe("Vietnam lunch");
  });
  it("does not claim an expense was saved or clear its fields when storage fails",()=>{
    const {get,localStorage}=setup();localStorage.setItem=()=>{throw new Error("Quota exceeded");};get("description").value="Dinner";get("amount").value="20";get("quick-form").fire("submit");
    expect(get("status").textContent).toContain("not saved");expect(get("amount").value).toBe("20");
  });
});
