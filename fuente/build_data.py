import json, math, importlib.util
spec=importlib.util.spec_from_file_location('trace','trace.py'); T=importlib.util.module_from_spec(spec); spec.loader.exec_module(T)
OX,OY=68,240           # crop origin (full-image coords)
MPP=400/216.5          # meters per pixel (Google Earth scale bar)
lines={k:[list(map(float,p)) for p in v] for k,v in T.LINES.items()}
def proj(pts,q):
    best=None
    for i in range(len(pts)-1):
        a,b=pts[i],pts[i+1]; dx,dy=b[0]-a[0],b[1]-a[1]; L2=dx*dx+dy*dy or 1
        t=max(0,min(1,((q[0]-a[0])*dx+(q[1]-a[1])*dy)/L2))
        p=(a[0]+t*dx,a[1]+t*dy); d=math.hypot(p[0]-q[0],p[1]-q[1])
        if best is None or d<best[0]: best=(d,i,t,p)
    return best
def nearest_pos(line,pos):
    return proj(lines[line],pos)[3]
# resolve link endpoints to coordinates; insert 'n' points into lines
resolved=[]
for (A,sa,B,sb,kind,pos) in T.LINKS:
    ends=[]
    for (L,sp,other) in ((A,sa,(B,sb)),(B,sb,(A,sa))):
        if L=='EN': ends.append(('EN',tuple(T.ENERGIZER))); continue
        if sp=='s': ends.append((L,tuple(lines[L][0])))
        elif sp=='e': ends.append((L,tuple(lines[L][-1])))
        else:
            q=pos
            if q is None:
                O,so=other; q=lines[O][0] if so=='s' else lines[O][-1]
            d,i,t,p=proj(lines[L],q)
            if 0.02<t<0.98 or True:
                if math.hypot(p[0]-lines[L][i][0],p[1]-lines[L][i][1])<0.5: pass
                elif math.hypot(p[0]-lines[L][i+1][0],p[1]-lines[L][i+1][1])<0.5: pass
                else: lines[L].insert(i+1,[p[0],p[1]])
            ends.append((L,(p[0],p[1])))
    resolved.append((ends[0],ends[1],kind,pos))
def idx(L,pt):
    if L=='EN': return ('EN',0)
    pts=lines[L]; j=min(range(len(pts)),key=lambda i:(pts[i][0]-pt[0])**2+(pts[i][1]-pt[1])**2)
    return (L,j)
out={'mpp':MPP,'size':[976,1170],'energizer':[T.ENERGIZER[0]-OX,T.ENERGIZER[1]-OY],'lines':{},'links':[],'gates':[],'bridges':[]}
tot=0
for k,pts in lines.items():
    P=[[round(x-OX,1),round(y-OY,1)] for x,y in pts]
    L=sum(math.hypot(P[i+1][0]-P[i][0],P[i+1][1]-P[i][1]) for i in range(len(P)-1))*MPP
    if k.startswith('PER'): kind='perimeter'
    else: kind='fence'
    out['lines'][k]={'pts':P,'m':round(L),'kind':kind}
    tot+=L
swn=0; brn=0
for (ea,eb,kind,pos) in resolved:
    na=idx(*ea); nb=idx(*eb)
    pa=[round(ea[1][0]-OX,1),round(ea[1][1]-OY,1)]; pb=[round(eb[1][0]-OX,1),round(eb[1][1]-OY,1)]
    rec={'a':list(na),'b':list(nb),'kind':kind,'pa':pa,'pb':pb}
    if pos: rec['pos']=[pos[0]-OX,pos[1]-OY]
    else: rec['pos']=[(pa[0]+pb[0])/2,(pa[1]+pb[1])/2]
    if kind=='sw': swn+=1; rec['id']='S%d'%swn
    if kind=='br': brn+=1; rec['id']='P%d'%brn
    out['links'].append(rec)
sws=sorted([r for r in out['links'] if r['kind']=='sw'],key=lambda r:(r['pos'][1],r['pos'][0]))
for i,r in enumerate(sws): r['id']='S%d'%(i+1)
out['gates']=[[x-OX,y-OY] for x,y in T.GATES]
out['bridgeDecor']=[[x-OX,y-OY] for x,y in T.BRIDGE_DECOR]
json.dump(out,open('network.json','w'),separators=(',',':'))
print('lines',len(lines),'links',len(resolved),'switches',swn,'bridges',brn,'total m',round(tot))
