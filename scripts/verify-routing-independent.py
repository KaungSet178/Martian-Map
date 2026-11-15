"""Independent numerical audit using standard math, numeric grids and native TIFFs.
Does not import either routing engine or reproduce its path search.
"""
import json,math,hashlib,argparse
from pathlib import Path
import numpy as np
import rasterio
R=3396190.0

def distance(a,b):
    l1,p1,l2,p2=map(math.radians,[a[0],a[1],b[0],b[1]])
    h=math.sin((p2-p1)/2)**2+math.cos(p1)*math.cos(p2)*math.sin((l2-l1)/2)**2
    return 2*R*math.atan2(math.sqrt(h),math.sqrt(max(0,1-h)))

def check_region(region):
    response=json.loads(Path(f"output/routing-qa/{region}.json").read_text())
    grid=json.loads(Path("data/routing/jezero/jezero_routing_grid.json").read_text()) if region=="jezero" else None
    raster=rasterio.open("data/routing/gale/gale-hrsc-30m-routing.tif") if region=="gale" else None
    values=raster.read(1) if raster else np.array(grid["elevations"],dtype=np.float32).reshape(grid["metadata"]["height"],-1)
    checks=[]
    alternative_costs=[]
    def horn(row,col):
        patch=values[row-1:row+2,col-1:col+2].astype(float)
        x,y=raster.transform*(col+.5,row+.5)
        lon,lat=math.degrees(x/R),math.degrees(y/R)
        dx=distance([lon,lat],[lon+math.degrees(30/R),lat]);dy=30.0
        p=(patch[0,2]+2*patch[1,2]+patch[2,2]-patch[0,0]-2*patch[1,0]-patch[2,0])/(8*dx)
        q=(patch[0,0]+2*patch[0,1]+patch[0,2]-patch[2,0]-2*patch[2,1]-patch[2,2])/(8*dy)
        return math.degrees(math.atan(math.hypot(p,q)))
    for route in response["alternatives"]:
        assert route["status"]=="unverified" and not route["registrationVerified"]
        heights=[]; cells=[]
        for lon,lat in route["coordinates"]:
            if raster:
                row,col=raster.index(R*math.radians(lon),R*math.radians(lat))
            else:
                meta=grid["metadata"]
                col=round((R*math.radians(lon-meta["bounds"]["west"]))/25-0.5)
                row=round((R*math.radians(meta["bounds"]["north"]-lat))/25-0.5)
            assert 0<=row<values.shape[0] and 0<=col<values.shape[1]
            z=float(values[row,col]);assert z != (raster.nodata if raster else -9999)
            if grid:
                index=row*grid["metadata"]["width"]+col
                assert grid["validMask"][index] and grid["slopes"][index]<=25
            if cells:
                dr,dc=abs(row-cells[-1][0]),abs(col-cells[-1][1]);assert max(dr,dc)==1
                if grid and dr and dc:
                    for rr,cc in [(row,cells[-1][1]),(cells[-1][0],col)]:
                        ii=rr*grid["metadata"]["width"]+cc
                        assert grid["validMask"][ii] and grid["slopes"][ii]<=25
            cells.append((row,col));heights.append(z)
        horizontal=surface=ascent=descent=weighted=maximum=0.0
        for i in range(1,len(heights)):
            d=distance(route["coordinates"][i-1],route["coordinates"][i]);dz=heights[i]-heights[i-1]
            grade=math.degrees(math.atan2(abs(dz),d))
            horizontal+=d;surface+=math.hypot(d,dz);ascent+=max(0,dz);descent+=max(0,-dz);weighted+=grade*d;maximum=max(maximum,grade)
        native_horizontal=lower_cost=0.0
        for i in range(1,len(cells)):
            previous,current=cells[i-1],cells[i]
            dz=heights[i]-heights[i-1]
            if grid:
                rr,cc=current
                d=math.hypot((cc-previous[1])*25*math.cos(math.radians((meta["bounds"]["north"]+meta["bounds"]["south"])/2)),(rr-previous[0])*25)
                slope=grid["slopes"][rr*meta["width"]+cc]
                cost=d*(1+2*(slope/10)**2+3*max(0,dz/d)+max(0,-dz/d))
            else:
                d=distance(route["coordinates"][i-1],route["coordinates"][i])
                cost=d*(1+3*min(max(0,dz/d),3)+.75*min(max(0,-dz/d),3)+.5*(max(horn(*previous),horn(*current))/20)**2)
            native_horizontal+=d;lower_cost+=cost
        alternative_costs.append((native_horizontal,lower_cost))
        for field,expected in [("distanceMeters",surface),("horizontalDistanceMeters",horizontal),("ascentMeters",ascent),("descentMeters",descent),("maximumSlopeDegrees",maximum),("meanSlopeDegrees",weighted/horizontal)]:
            assert math.isclose(route[field],expected,rel_tol=1e-9,abs_tol=1e-5),(region,field,route[field],expected)
        for requested,snapped,reported in zip(route["requestedWaypoints"],route["snappedWaypoints"],route["snapDistancesMeters"],strict=True):
            assert math.isclose(distance(requested,snapped),reported,abs_tol=1e-5) and reported<=100
        assert route["coordinates"][0]==route["snappedWaypoints"][0] and route["coordinates"][-1]==route["snappedWaypoints"][-1]
        assert len(route["segments"])==len(route["requestedWaypoints"])-1
        checks.append({"preference":route["preference"],"cells":len(cells),"horizontal_m":horizontal,"surface_m":surface,"ascent_m":ascent,"descent_m":descent,"valid_connected_cells":True,"snapping_checked":True})
    assert alternative_costs[0][0]<=alternative_costs[1][0]+0.1, "Shortest must minimize the native horizontal graph objective"
    assert alternative_costs[1][1]<=alternative_costs[0][1]+0.1, "Lower-cost path must reduce the documented regional objective"
    for check,cost in zip(checks,alternative_costs):
        check["native_horizontal_objective_m"]=cost[0];check["independent_lower_terrain_cost"]=cost[1]
    if raster:raster.close()
    return checks

def check_native_jezero(path):
    grid=json.loads(Path("data/routing/jezero/jezero_routing_grid.json").read_text());meta=grid["metadata"]
    digest=hashlib.file_digest(open(path,"rb"),"sha256").hexdigest();assert digest==meta["sourceSha256"]
    checked=[]
    with rasterio.open(path) as source:
        for col,row in [(100,80),(300,100),(500,120)]:
            from rasterio.windows import Window
            tile=source.read(1,window=Window(125+col*25,10332+row*25,25,25))
            valid=np.isfinite(tile)&(tile!=source.nodata)
            index=row*meta["width"]+col
            if valid.sum()<563:continue
            expected=float(np.float32(np.round(np.where(valid,tile,0).sum()/valid.sum(),1)))
            assert math.isclose(grid["elevations"][index],expected,abs_tol=0.001)
            x,y=source.transform*(125+(col+.5)*25,10332+(row+.5)*25)
            expected_lon,expected_lat=math.degrees(x/R),math.degrees(y/R)
            runtime_lon=meta["bounds"]["west"]+math.degrees((col+.5)*25/R)
            runtime_lat=meta["bounds"]["north"]-math.degrees((row+.5)*25/R)
            assert abs(runtime_lon-expected_lon)<0.0000006 and abs(runtime_lat-expected_lat)<0.0000006
            checked.append({"cell":[col,row],"native_mean_m":expected,"source_georeferencing_checked":True})
    assert checked
    return {"source_sha256":digest,"samples":checked}

if __name__ == "__main__":
    parser=argparse.ArgumentParser();parser.add_argument("--jezero-dem",required=True);args=parser.parse_args()
    report={region:check_region(region) for region in ["gale","jezero"]}
    report["native_jezero"]=check_native_jezero(args.jezero_dem)
    Path("output/routing-qa/independent-validation.json").write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps(report,indent=2))
