import { db } from "@/lib/server/db";
import { getUser, limited, unauthorized } from "@/lib/server/http";
import { cafeError, cafeJson } from "@/lib/server/cafe";
import { CafeServiceError, integer, must, textField, transaction, notifyOwner } from "@/lib/server/cafeServices";

type Product={id:number;seller_id:string;title:string;price:number;stock:number;shipping:number;bank:string;status:string};
type Order={id:number;buyer_id:string;seller_id:string;items:string;status:string;total:number};
const categories=["펌제","염색·탈색","클리닉","샴푸·린스","미용기자재","소도구","가위","롯드","미용도서","중고"];
function product(value:unknown){const row=db.prepare("SELECT * FROM cafe_products WHERE id=?").get(integer(value,1,1e10,"상품 번호")) as Product|undefined;must(row,"상품을 찾을 수 없어요",404);return row;}
export async function GET(req:Request){
 const user=getUser(req),sp=new URL(req.url).searchParams,area=sp.get('area')||'products';
 try {
  if(area==='products'){
   const q=(sp.get('q')||'').slice(0,100),category=sp.get('category')||'';
   const rows=db.prepare(`SELECT p.id,p.seller_id,u.name AS seller_name,p.title,p.body,p.category,p.price,p.stock,p.shipping,p.status,EXISTS(SELECT 1 FROM cafe_product_images pi WHERE pi.product_id=p.id) AS has_photo,
    (SELECT COUNT(*) FROM cafe_orders o WHERE o.seller_id=p.seller_id AND o.status='completed') AS sales
    FROM cafe_products p JOIN users u ON u.id=p.seller_id WHERE p.status='active' AND u.suspended_at IS NULL AND (?='' OR instr(p.title,?)>0) AND (?='' OR p.category=?) ORDER BY p.id DESC LIMIT 100`).all(q,q,category,category);
   return cafeJson({items:rows.map(r=>({...r,reviews:db.prepare("SELECT rv.rating,rv.body FROM cafe_product_reviews rv JOIN cafe_orders o ON o.id=rv.order_id WHERE EXISTS(SELECT 1 FROM json_each(o.items) j WHERE json_extract(j.value,'$.id')=?) ORDER BY rv.id DESC LIMIT 20").all(r.id as number)})),categories});
  }
  if(!user)return unauthorized();
  if(area==='product-inbox')return cafeJson({items:db.prepare("SELECT q.*,p.title,p.seller_id,u.name FROM cafe_product_inquiries q JOIN cafe_products p ON p.id=q.product_id JOIN users u ON u.id=q.user_id WHERE q.user_id=? OR p.seller_id=? ORDER BY q.id DESC LIMIT 200").all(user.id,user.id)});
  if(area==='cart')return cafeJson({items:db.prepare("SELECT c.quantity,p.id,p.title,p.price,p.stock,p.shipping,p.seller_id,p.status,u.name AS seller_name FROM cafe_cart c JOIN cafe_products p ON p.id=c.product_id JOIN users u ON u.id=p.seller_id WHERE c.user_id=? ORDER BY p.id").all(user.id)});
  if(area==='selling')return cafeJson({items:db.prepare("SELECT * FROM cafe_products WHERE seller_id=? ORDER BY id DESC LIMIT 200").all(user.id),categories});
  if(area==='orders'){
   const rows=db.prepare(`SELECT o.*,u.name AS buyer_name,v.name AS seller_name FROM cafe_orders o JOIN users u ON u.id=o.buyer_id JOIN users v ON v.id=o.seller_id WHERE o.buyer_id=? OR o.seller_id=? ORDER BY o.id DESC LIMIT 200`).all(user.id,user.id);
   return cafeJson({items:rows.map(r=>({...r,items:JSON.parse(r.items as string),reviews:db.prepare("SELECT rating,body FROM cafe_product_reviews WHERE order_id=?").all(r.id as number),messages:db.prepare("SELECT m.id,m.body,u.name FROM cafe_order_messages m JOIN users u ON u.id=m.author_id WHERE order_id=? ORDER BY m.id DESC LIMIT 100").all(r.id as number).reverse()}))});
  }
  return cafeError("존재하지 않는 메뉴예요",404);
 }catch(e){return cafeError((e as Error).message,e instanceof CafeServiceError?e.status:500);}
}
export async function POST(req:Request){
 const user=getUser(req);if(!user)return unauthorized();
 if(limited(`cafe-market:${user.id}`,60000,40))return cafeError("잠시 후 다시 시도해주세요",429);
 try {
  const v=await req.json();must(v&&typeof v==='object',"요청 내용을 확인해주세요");
  if(v.action==='product-inquiry'){
   const p=product(v.productId);must(p.status==='active',"판매 중인 상품이 아니에요",409);must(p.seller_id!==user.id,"본인 상품에는 문의할 수 없어요");db.prepare("INSERT INTO cafe_product_inquiries(product_id,user_id,question) VALUES(?,?,?)").run(p.id,user.id,textField(v.question,"상품 문의",2000));notifyOwner(p.seller_id,"상품 문의가 접수됐어요","/cafe/services/product-inbox");
  }else if(v.action==='product-answer'){
   const q=db.prepare("SELECT q.*,p.seller_id FROM cafe_product_inquiries q JOIN cafe_products p ON p.id=q.product_id WHERE q.id=?").get(integer(v.id,1,1e10,"문의 번호")) as {id:number;user_id:string;seller_id:string}|undefined;must(q,"상품 문의가 없어요",404);must(q.seller_id===user.id,"판매자만 답변할 수 있어요",403);db.prepare("UPDATE cafe_product_inquiries SET answer=? WHERE id=?").run(textField(v.answer,"상품 답변",2000),q.id);notifyOwner(q.user_id,"상품 문의에 답변이 왔어요","/cafe/services/product-inbox");
  }else if(v.action==='order-message'){
   const o=db.prepare("SELECT buyer_id,seller_id FROM cafe_orders WHERE id=?").get(integer(v.id,1,1e10,"주문 번호")) as {buyer_id:string;seller_id:string}|undefined;must(o&&(o.buyer_id===user.id||o.seller_id===user.id),"주문 당사자만 문의할 수 있어요",403);db.prepare("INSERT INTO cafe_order_messages(order_id,author_id,body) VALUES(?,?,?)").run(v.id,user.id,textField(v.message,"주문 문의",2000));notifyOwner(o.buyer_id===user.id?o.seller_id:o.buyer_id,"주문에 새 문의가 왔어요","/cafe/services/orders");
  }else if(v.action==='product'){
   const category=textField(v.category,"상품 분류",30);must(categories.includes(category),"상품 분류를 확인해주세요");
   const values=[textField(v.title,"상품명",100),textField(v.body,"상품 설명",6000),category,integer(v.price,0,100000000,"판매 금액"),integer(v.stock,0,1000000,"재고"),integer(v.shipping??0,0,100000,"배송비"),textField(v.bank,"입금 계좌·예금주",200)];
   if(v.id){const p=product(v.id);must(p.seller_id===user.id,"판매자만 수정할 수 있어요",403);db.prepare("UPDATE cafe_products SET title=?,body=?,category=?,price=?,stock=?,shipping=?,bank=? WHERE id=?").run(...values,p.id);}
   else {const result=db.prepare("INSERT INTO cafe_products(title,body,category,price,stock,shipping,bank,seller_id) VALUES(?,?,?,?,?,?,?,?)").run(...values,user.id);return cafeJson({id:Number(result.lastInsertRowid)},201);}
  }else if(v.action==='product-status'){
   const p=product(v.id);must(p.seller_id===user.id||user.isAdmin,"권한이 없어요",403);must(['active','hidden'].includes(v.status),"상품 상태를 확인해주세요");db.prepare("UPDATE cafe_products SET status=? WHERE id=?").run(v.status,p.id);
  }else if(v.action==='cart'){
   const p=product(v.productId),quantity=integer(v.quantity,0,100,"수량");must(p.seller_id!==user.id,"본인 상품은 주문할 수 없어요");
   if(!quantity)db.prepare("DELETE FROM cafe_cart WHERE user_id=? AND product_id=?").run(user.id,p.id);
   else {must(p.status==='active'&&quantity<=p.stock,"판매 중인 재고를 확인해주세요",409);db.prepare("INSERT INTO cafe_cart(user_id,product_id,quantity) VALUES(?,?,?) ON CONFLICT(user_id,product_id) DO UPDATE SET quantity=excluded.quantity").run(user.id,p.id,quantity);}
  }else if(v.action==='checkout'){
   const recipient=textField(v.recipient,"수령인",50),phone=textField(v.phone,"연락처",30),address=textField(v.address,"배송 주소",300),key=textField(v.requestKey,"주문 요청 번호",100);must(/^[0-9+()\-\s]{8,30}$/.test(phone),"연락처를 확인해주세요");
   const ids=transaction(()=>{
    const prior=db.prepare("SELECT id FROM cafe_orders WHERE buyer_id=? AND request_key=?").all(user.id,key) as {id:number}[];if(prior.length)return prior.map(r=>r.id);
    const cart=db.prepare("SELECT product_id,quantity FROM cafe_cart WHERE user_id=?").all(user.id) as {product_id:number;quantity:number}[];must(cart.length>0&&cart.length<=100,"장바구니를 확인해주세요");
    const groups=new Map<string,{bank:string;shipping:number;items:{id:number;title:string;price:number;quantity:number}[]}>();
    must(Array.isArray(v.quote)&&v.quote.length===cart.length,"주문 금액을 다시 확인해주세요",409);
    for(const row of cart){const p=product(row.product_id);const quote=v.quote.find((q:{id:number})=>q.id===p.id);must(quote&&quote.price===p.price&&quote.quantity===row.quantity&&quote.shipping===p.shipping,"상품 금액·수량·배송비가 변경됐어요. 다시 확인해주세요",409);must(p.status==='active'&&p.stock>=row.quantity,"상품 재고가 변경됐어요. 장바구니를 확인해주세요",409);must(p.seller_id!==user.id,"본인 상품은 주문할 수 없어요");must(db.prepare("SELECT 1 FROM users WHERE id=? AND suspended_at IS NULL").get(p.seller_id),"판매자 계정 상태를 확인해주세요",409);const g=groups.get(p.seller_id)||{bank:p.bank,shipping:0,items:[]};g.shipping=Math.max(g.shipping,p.shipping);g.items.push({id:p.id,title:p.title,price:p.price,quantity:row.quantity});groups.set(p.seller_id,g);db.prepare("UPDATE cafe_products SET stock=stock-? WHERE id=?").run(row.quantity,p.id);}
    const result:number[]=[];
    for(const [seller,g] of groups){const total=g.items.reduce((n,p)=>n+p.price*p.quantity,0)+g.shipping;const r=db.prepare("INSERT INTO cafe_orders(buyer_id,seller_id,items,total,recipient,phone,address,bank,request_key) VALUES(?,?,?,?,?,?,?,?,?)").run(user.id,seller,JSON.stringify(g.items),total,recipient,phone,address,g.bank,key);result.push(Number(r.lastInsertRowid));notifyOwner(seller,"새 상품 주문이 접수됐어요","/cafe/services/orders");}
    db.prepare("DELETE FROM cafe_cart WHERE user_id=?").run(user.id);return result;
   });return cafeJson({ids},201);
  }else if(v.action==='order-status'){
   transaction(()=>{
    const order=db.prepare("SELECT * FROM cafe_orders WHERE id=?").get(integer(v.id,1,1e10,"주문 번호")) as Order|undefined;must(order,"주문을 찾을 수 없어요",404);
    const buyer=user.id===order.buyer_id,seller=user.id===order.seller_id;must(buyer||seller,"주문 당사자만 처리할 수 있어요",403);
    const next=String(v.status);
    const transitions:Record<string,{from:string[];role:boolean}>={payment_submitted:{from:['awaiting_payment'],role:buyer},paid:{from:['awaiting_payment','payment_submitted'],role:seller},shipped:{from:['paid'],role:seller},completed:{from:['shipped'],role:buyer},cancelled:{from:['awaiting_payment'],role:buyer||seller},refund_requested:{from:['payment_submitted','paid','shipped','completed'],role:buyer},refunded:{from:['refund_requested'],role:seller},awaiting_payment:{from:['payment_submitted'],role:seller}};
    const rule=transitions[next];must(rule&&rule.role,"처리 권한이 없어요",403);must(rule.from.includes(order.status),"주문 상태가 변경됐어요. 다시 확인해주세요",409);
    const tracking=next==='shipped'?textField(v.tracking,"택배사·송장 번호",100):null;
    if(next==='cancelled')for(const item of JSON.parse(order.items))db.prepare("UPDATE cafe_products SET stock=stock+? WHERE id=?").run(item.quantity,item.id);
    db.prepare("UPDATE cafe_orders SET status=?,tracking=COALESCE(?,tracking) WHERE id=?").run(next,tracking,order.id);
    notifyOwner(buyer?order.seller_id:order.buyer_id,`주문 #${order.id} 처리 상태가 변경됐어요`,"/cafe/services/orders");
   });
  }else if(v.action==='review'){
   const o=db.prepare("SELECT * FROM cafe_orders WHERE id=?").get(integer(v.id,1,1e10,"주문 번호")) as Order|undefined;must(o&&o.buyer_id===user.id&&o.status==='completed',"구매 확정한 주문에만 후기를 작성할 수 있어요",403);must(!db.prepare("SELECT 1 FROM cafe_product_reviews WHERE order_id=? AND user_id=?").get(o.id,user.id),"이미 작성한 후기예요",409);db.prepare("INSERT INTO cafe_product_reviews(order_id,user_id,rating,body) VALUES(?,?,?,?)").run(o.id,user.id,integer(v.rating,1,5,"별점"),textField(v.body,"후기",2000));
  }else return cafeError("지원하지 않는 요청이에요");
  return cafeJson({ok:true});
 }catch(e){return cafeError(e instanceof CafeServiceError?e.message:"입력 내용을 확인하고 다시 시도해주세요",e instanceof CafeServiceError?e.status:400);}
}
