import numpy as np

def compute_slope(dem: np.ndarray, cell_size_m: float = 30.0) -> np.ndarray:
    """
    Computes slope in degrees using Horn's 3x3 finite-difference algorithm:
    [a, b, c]
    [d, e, f]
    [g, h, i]
    dz/dx = ((c + 2f + i) - (a + 2d + g)) / (8 * cell_size)
    dz/dy = ((g + 2h + i) - (a + 2b + c)) / (8 * cell_size)
    slope_rad = arctan(sqrt((dz/dx)^2 + (dz/dy)^2))
    """
    dem = dem.astype(np.float64)
    rows, cols = dem.shape
    slope_deg = np.zeros_like(dem, dtype=np.float32)

    # Pad boundaries using edge reflection
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

    rise_run = np.sqrt(dz_dx**2 + dz_dy**2)
    slope_rad = np.arctan(rise_run)
    slope_deg = np.degrees(slope_rad).astype(np.float32)

    return slope_deg
