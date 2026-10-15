import type { FormEvent } from 'react';
import type { Resume } from '@/lib/cafe';
export type Item={id:number|string;title?:string;body?:string;name?:string;board?:string;user_id?:string;owner_id?:string;post_id?:number;message?:string;reason?:string;status?:string;sender_name?:string;owner_name?:string;author_name?:string;applicant_name?:string;preview?:string;bio?:string;skills?:string;region?:string;years?:number;grade?:number;posts?:number;attendance?:number;desired_job?:string;price?:number;stock?:number;shipping?:number;category?:string;quantity?:number;seller_id?:string;buyer_id?:string;seller_name?:string;buyer_name?:string;recipient?:string;phone?:string;address?:string;bank?:string;tracking?:string;total?:number;items?:{id:number;title:string;price:number;quantity:number}[];reviews?:{rating:number;body:string}[];score?:number;question?:string;answer?:string;messages?:{id:number;name:string;body:string}[];has_photo?:number;public_resume?:number;resume?:Resume|null;viewed_at?:string|null;interview_at?:string|null;message_count?:number;no_show_count?:number;created_at?:string};
export type ServiceData={boostPerDay?:number;resume?:Resume|null;name?:string;items?:Item[];profile?:Item;requests?:Item[];grades?:Item[];ads?:Item[];reports?:Item[];categories?:string[];activity?:{posts:number;attendance:number};follows?:{board:string}[];thread?:{id:number}};
export type Run=(value:Record<string,unknown>)=>Promise<boolean>;
export const input='mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-foreground';
export const button='rounded-xl border border-border px-4 py-2 text-sm disabled:opacity-40 hover:border-rose-400/50';
export const card='rounded-2xl border border-border bg-surface p-5';
export function Field({name,label,value='',type='text',required=true}:{name:string;label:string;value?:string|number;type?:string;required?:boolean}){
 return <label className="block text-sm">{label}{type==='textarea'?<textarea name={name} required={required} maxLength={6000} rows={4} defaultValue={value} className={input}/>:<input name={name} required={required} type={type} maxLength={300} defaultValue={value} min={type==='number'?0:undefined} className={input}/>}</label>;
}
export function values(form:HTMLFormElement){return Object.fromEntries(new FormData(form));}
export function submit(run:Run,action:string,extra:Record<string,unknown>={}){return async(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();const form=e.currentTarget;if(await run({...values(form),action,...extra}))form.reset();};}
