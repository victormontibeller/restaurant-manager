package br.com.restaurantmanager.identidade;

public class AuthFailure extends RuntimeException {
    private final int status;
    private final String code;
    public AuthFailure(int status, String code, String message) { super(message); this.status = status; this.code = code; }
    public int status() { return status; }
    public String code() { return code; }
    public static AuthFailure invalid() { return new AuthFailure(401, "CREDENCIAL_INVALIDA", "Credencial inválida ou sessão encerrada."); }
}
