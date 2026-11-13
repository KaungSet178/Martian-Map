"""Offline DEM mathematics in metres on the declared Mars reference sphere.

These functions calculate a DEM representation, never hazard/safety classes.
"""
import numpy as np


def block_mean(z, valid, factor):
    """Mean only complete valid blocks; never bridge nodata or invent posts."""
    h, w = z.shape
    if factor < 1 or h % factor or w % factor:
        raise ValueError("Grid dimensions must be divisible by aggregation factor")
    shape = (h//factor, factor, w//factor, factor)
    mask = valid.reshape(shape).all(axis=(1, 3))
    values = np.where(valid, z, 0).reshape(shape).mean(axis=(1, 3), dtype=np.float64)
    return np.where(mask, values, np.nan), mask


def terrain_fields(z, valid, step_m, latitudes_deg, azimuth_deg=315, altitude_deg=45):
    """Horn 3x3 derivatives with local equirectangular metric correction.

    p = dz/dEast; q = dz/dNorth. Reference projection has lat_ts=0.
    Output omits the unsupported outer cell ring. All 9 posts must be valid.
    """
    if step_m <= 0 or z.shape[0] != len(latitudes_deg):
        raise ValueError("Positive metre spacing and one latitude per row required")
    mask = np.logical_and.reduce([valid[y:y+z.shape[0]-2, x:x+z.shape[1]-2]
                                 for y in range(3) for x in range(3)])
    dx = step_m * np.cos(np.radians(latitudes_deg[1:-1, None]))
    p = (z[:-2, 2:]+2*z[1:-1, 2:]+z[2:, 2:]-z[:-2, :-2]-2*z[1:-1, :-2]-z[2:, :-2])/(8*dx)
    q = (z[:-2, :-2]+2*z[:-2, 1:-1]+z[:-2, 2:]-z[2:, :-2]-2*z[2:, 1:-1]-z[2:, 2:])/(8*step_m)
    slope = np.degrees(np.arctan(np.hypot(p, q)))
    az, alt = np.radians([azimuth_deg, altitude_deg])
    light = (-p*np.sin(az)*np.cos(alt)-q*np.cos(az)*np.cos(alt)+np.sin(alt))/np.sqrt(1+p*p+q*q)
    return np.where(mask, slope, np.nan), np.where(mask, np.clip(light, 0, 1), np.nan), mask
