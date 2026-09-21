import { NextResponse } from "next/server";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { accessRequestStore } from "@/lib/access-requests/store";
import { ACCESS_REQUEST_KINDS, ACCESS_REQUEST_STATUSES } from "@/types/access-request";
import { withRlsContext } from "@/lib/db/rls-context";
import { auditLog } from "@/lib/audit/store";
import { z } from "zod";
const patchSchema=z.object({status:z.enum(ACCESS_REQUEST_STATUSES).optional(),unionId:z.string().trim().min(1).nullable().optional(),localId:z.string().trim().min(1).nullable().optional(),privateNote:z.string().trim().max(4000).nullable().optional()}).strict();
async function gate(){const r=await requireSiteAdminSession();if(!r.ok)return r;return r;}
export async function GET(req:Request){const a=await gate();if(!a.ok)return NextResponse.json({error:a.error},{status:a.status});const u=new URL(req.url);const status=u.searchParams.get("status")??undefined;const kind=u.searchParams.get("kind")??undefined;const items=await withRlsContext({userId:a.session.user.id,unionId:a.session.user.unionId,mfaVerified:true,crossLocal:true},()=>accessRequestStore.list({status:ACCESS_REQUEST_STATUSES.includes(status as never)?status as never:undefined,kind:ACCESS_REQUEST_KINDS.includes(kind as never)?kind as never:undefined}));await auditLog.log({userId:a.session.user.id,action:"site_admin.access_request.list",resourceType:"access_request",resourceId:"*"});return NextResponse.json({items});}
export async function PATCH(req:Request){const a=await gate();if(!a.ok)return NextResponse.json({error:a.error},{status:a.status});const id=new URL(req.url).pathname.split("/").pop();if(!id)return NextResponse.json({error:"Missing id"},{status:400});let raw:unknown;try{raw=await req.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}const parsed=patchSchema.safeParse(raw);if(!parsed.success)return NextResponse.json({error:"Invalid request"},{status:400});const row=await withRlsContext({userId:a.session.user.id,unionId:a.session.user.unionId,mfaVerified:true,crossLocal:true},()=>accessRequestStore.update(id,parsed.data));if(!row)return NextResponse.json({error:"Not found"},{status:404});await auditLog.log({userId:a.session.user.id,action:"site_admin.access_request.update",resourceType:"access_request",resourceId:id,metadata:{status:row.status}});return NextResponse.json({item:row});}


