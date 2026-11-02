import { createContext, useContext } from 'react'

// Standalone components keep their existing behavior. The authenticated admin
// layout supplies the resolved role and defaults to read-only while checking it.
export const AdminAccessContext = createContext({ readOnly: false })
export const useAdminAccess = () => useContext(AdminAccessContext)
