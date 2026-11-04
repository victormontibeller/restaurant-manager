package br.com.restaurantmanager.tenancy;

public final class TenantScope implements AutoCloseable {
    private static final ThreadLocal<String> CURRENT = new ThreadLocal<>();
    private TenantScope(String schema) {
        if (CURRENT.get() != null) throw new IllegalStateException("Contexto empresarial já definido.");
        if (!schema.matches("t_[a-f0-9]{32}")) throw new IllegalArgumentException("Contexto empresarial inválido.");
        CURRENT.set(schema);
    }
    public static TenantScope open(String schema) { return new TenantScope(schema); }
    public static String current() { return CURRENT.get() == null ? "__none__" : CURRENT.get(); }
    @Override public void close() { CURRENT.remove(); }
}
