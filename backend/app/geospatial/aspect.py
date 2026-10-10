import numpy as np

def compute_aspect(dem: np.ndarray, cell_size_m: float = 30.0) -> np.ndarray:
    """
    Computes aspect (compass direction of steepest descent) in degrees [0, 360).
    North = 0/360, East = 90, South = 180, West = 270. Flat terrain = -1.
    """
    dem = dem.astype(np.float64)
    padded = np.pad(dem, 1, mode='edge')
    a = padded[:-2, :-2]
    b = padded[:-2, 1:-1]
    c = padded[:-2, 2:]
    d = padded[1:-1, :-2]
    f = padded[1:-1, 2:]
    g = padded[2:, :-2]
    h = padded[2:, 1:-1]
    i = padded[2:, 2:]

    dz_dx = ((c + 2.0 * f + i) - (a + 2.0 * d + g)) / (8.0 * cell_size_m)
    dz_dy = ((g + 2.0 * h + i) - (a + 2.0 * b + c)) / (8.0 * cell_size_m)

    aspect_rad = np.arctan2(dz_dy, -dz_dx)
    aspect_deg = np.degrees(aspect_rad)

    # Convert to compass heading
    compass = 90.0 - aspect_deg
    compass = np.where(compass < 0.0, compass + 360.0, compass)
    flat = (dz_dx == 0) & (dz_dy == 0)
    compass[flat] = -1.0

    return compass.astype(np.float32)
