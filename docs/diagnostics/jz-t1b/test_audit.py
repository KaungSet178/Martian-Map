import json,gzip,math,unittest,sys
from pathlib import Path
sys.path.insert(0,'D:/martian-map/output/g3-geology/python-libs')
sys.path.insert(0,str(Path('.audit-python').resolve()))
from pyproj import CRS,Transformer
from shapely.geometry import shape,box
class AlignmentAudit(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.root=Path('docs/diagnostics/jz-t1b');cls.m=json.loads((cls.root/'measurements.json').read_text())
 def test_source_geometry_integrity(self):
  p=self.m['projection_checks'];self.assertEqual(p['feature_count'],1308);self.assertEqual(p['valid_count'],1306);self.assertEqual([r['objectid'] for r in p['invalid']],[669,1159]);self.assertTrue(all(r['reason'] for r in p['invalid']))
 def test_independent_projection_and_roundtrip(self):
  p=self.m['projection_checks'];self.assertGreater(p['sample_count'],1000);self.assertLess(p['application_vs_pyproj_max_m'],1e-5);self.assertLess(p['roundtrip_max_m'],1e-5)
 def test_axis_and_central_meridian(self):
  crs=CRS.from_wkt(self.m['projection_checks']['geology_wkt']);geo=crs.geodetic_crs;t=Transformer.from_crs(crs,geo,always_xy=True);lon,lat=t.transform(0,0);self.assertAlmostEqual(lon,77.5,places=10);self.assertAlmostEqual(lat,0,places=10);self.assertAlmostEqual(crs.ellipsoid.semi_major_metre,3396190)
 def test_actual_map_and_polygon_coverage(self):
  self.assertEqual(self.m['map_footprint_wsen'],[77.186786,18.401964,77.493133,18.519663]);self.assertEqual(len(self.m['unit_groups']),15);self.assertEqual(sum(bool(r['intersecting_objectids']) for r in self.m['unit_groups']),9)
  with gzip.open(self.root/'original-intersecting-polygons.geojson.gz','rt') as f:features=json.load(f)['features']
  foot=box(*self.m['map_footprint_wsen']);self.assertEqual(len(features),62)
  for f in features:self.assertTrue(shape(f['geometry']).is_valid);self.assertTrue(shape(f['geometry']).intersects(foot))
 def test_pixel_centers_roundtrip(self):
  a,b,c,d,e,f=self.m['application_ctx']['affine'];col,row=2500,2500;x=c+(col+.5)*a;y=f+(row+.5)*e;self.assertAlmostEqual((x-c)/a-.5,col);self.assertAlmostEqual((y-f)/e-.5,row);self.assertEqual(self.m['application_ctx']['nodata'],0)
 def test_committed_tile_matches_independent_geometry(self):
  t=json.loads((self.root/'tile-validation.json').read_text());self.assertGreater(t['interior_pixels_compared'],60000);self.assertEqual(t['interior_mismatches'],0)
 def test_image_validation_sets_are_independent(self):
  r=self.m['registration']['relative_image_registration'];ties=r['candidate_ties'];cal={t['id'] for t in ties if t['role']=='calibration'};val={t['id'] for t in ties if t['role']=='validation'};self.assertFalse(cal&val);self.assertEqual(len(cal),5);self.assertEqual(len(val),4);self.assertFalse(any(t['search_boundary_hit'] for t in ties));rmse=math.sqrt(sum(t['translation_holdout_residual_m']**2 for t in ties if t['role']=='validation')/4);self.assertAlmostEqual(rmse,r['holdout_rmse_m'])
 def test_independent_registration_gate_remains_closed(self):
  r=self.m['registration'];self.assertEqual(r['absolute_status'],'UNVERIFIED');self.assertEqual(r['accepted_ground_control_points'],0);self.assertFalse(r['correction_applied']);self.assertTrue(all(not g['selectable'] for g in self.m['unit_groups']))
 def test_hirise_header_conflict_detected(self):
  h=self.m['hirise_header_discrepancy'];self.assertTrue(h['status'].startswith('CONFLICT'));self.assertTrue(all(p['difference_m']>900000 for p in h['comparisons']));self.assertAlmostEqual(h['comparisons'][0]['pds_label_lonlat'][0],77.382125238101,places=6)
if __name__=='__main__':unittest.main(verbosity=2)
